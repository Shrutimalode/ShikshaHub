const Blog = require('../models/Blog');
const Community = require('../models/Community');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendBlogUploadEmail, sendBlogReviewEmail } = require('../utils/emailService');
require('dotenv').config();

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: 'v1'
});

// Create a new blog post
exports.createBlog = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      communityId, 
      isOriginalContent, 
      realAuthorName, 
      sourceUrl,
      tags 
    } = req.body;
    
    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verify user belongs to community
    const isMember = 
      community.admin.toString() === userId ||
      community.teachers.some(teacherId => teacherId.toString() === userId) ||
      community.students.some(studentId => studentId.toString() === userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

    // Create new blog
    const newBlog = new Blog({
      title,
      content,
      community: communityId,
      author: userId,
      authorRole: userRole,
      isOriginalContent: isOriginalContent === 'false' ? false : true,
      realAuthorName: !isOriginalContent ? realAuthorName : undefined,
      sourceUrl: !isOriginalContent ? sourceUrl : undefined,
      tags: tagArray
    });

    // Auto-approve if admin (handled by pre-save hook)
    await newBlog.save();

    // Add blog to community
    await Community.findByIdAndUpdate(
      communityId,
      { $push: { blogs: newBlog._id } }
    );

    // Remove blog upload notification to all members

    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blogs by community (with permission and status filters)
exports.getBlogsByCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    
    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Verify user belongs to community
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    const isMember = isAdmin || isTeacher || isStudent;
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    let query = { community: communityId };

    // Users see:
    // - All approved blogs
    // - Their own pending/rejected blogs
    // Admins see all blogs (for review)
    // Teachers see approved blogs + student pending blogs (for review) + their own blogs
    if (!isAdmin) {
      if (isTeacher) {
        // Teachers see: approved blogs + student pending blogs (for review) + their own blogs
        query.$or = [
          { status: 'approved' },
          { author: userId },
          { status: 'pending', authorRole: 'student' }
        ];
      } else {
        // Students see: approved blogs + their own blogs
        query.$or = [
          { status: 'approved' },
          { author: userId }
        ];
      }
    }

    // Get blogs
    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(blogs);
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;
    
    const blog = await Blog.findById(blogId)
      .populate('author', 'name email')
      .populate('reviewedBy', 'name')
      .populate('community', 'name');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check permissions - only allow access to:
    // 1. Approved blogs for community members
    // 2. User's own blogs
    // 3. Pending student blogs for teachers/admins
    // 4. All blogs for admin
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const community = await Community.findById(blog.community);
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    const isAuthor = blog.author._id.toString() === userId;
    
    if (!isAuthor && !isAdmin && !(isTeacher && blog.authorRole === 'student' && blog.status === 'pending')) {
      if (blog.status !== 'approved') {
        return res.status(403).json({ message: 'You do not have permission to view this blog post' });
      }
    }

    res.json(blog);
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { 
      title, 
      content, 
      isOriginalContent, 
      realAuthorName, 
      sourceUrl,
      tags 
    } = req.body;
    
    // Find blog
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is author
    const userId = req.user.id;
    
    if (blog.author.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to update this blog post' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : blog.tags;

    // Update blog
    blog.title = title || blog.title;
    blog.content = content || blog.content;
    
    if (isOriginalContent !== undefined) {
      blog.isOriginalContent = isOriginalContent === 'false' ? false : true;
    }
    
    if (!blog.isOriginalContent) {
      if (realAuthorName) {
        blog.realAuthorName = realAuthorName;
      }
      if (sourceUrl !== undefined) {
        blog.sourceUrl = sourceUrl;
      }
    } else {
      blog.realAuthorName = undefined;
      blog.sourceUrl = undefined;
    }
    
    blog.tags = tagArray;
    
    // Status will be reset to pending if title/content changed (handled by pre-save hook)
    const updatedBlog = await blog.save();

    res.json(updatedBlog);
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    
    // Find blog
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is admin or author
    const userId = req.user.id;
    const isAuthor = blog.author.toString() === userId;
    
    if (!isAuthor) {
      return res.status(403).json({ message: 'You are not authorized to delete this blog post' });
    }

    // Remove blog from community
    await Community.findByIdAndUpdate(
      blog.community,
      { $pull: { blogs: blogId } }
    );

    // Delete blog
    await Blog.findByIdAndDelete(blogId);

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Review blog (approve/reject) - Admin/Teacher only
exports.reviewBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { status, reviewComment } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find blog
    const blog = await Blog.findById(blogId)
      .populate('community')
      .populate('author');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Verify reviewer has permission
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const community = blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    // Teachers can only review student blogs
    if (!isAdmin && !(isTeacher && blog.authorRole === 'student')) {
      return res.status(403).json({ message: 'You are not authorized to review this blog post' });
    }
    
    // Admin can review any blog
    // Teacher can only review student blogs
    if (blog.authorRole === 'teacher' && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can review teacher blog posts' });
    }

    // Update review status
    blog.status = status;
    blog.reviewedBy = userId;
    blog.reviewComment = reviewComment;
    blog.reviewedAt = Date.now();

    await blog.save();

    // Notify blog author if they want review emails
    const author = await User.findById(blog.author);
    if (author && author.emailPreferences?.blogReview !== false) {
      sendBlogReviewEmail(author.email, blog.title, status);
    }

    res.json({
      message: `Blog ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      blog
    });
  } catch (error) {
    console.error('Review blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resubmit a rejected blog - Author only
exports.resubmitBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    
    // Find blog
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is author
    const userId = req.user.id;
    
    if (blog.author.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to resubmit this blog post' });
    }
    
    // Check if blog is rejected
    if (blog.status !== 'rejected') {
      return res.status(400).json({ message: 'Only rejected blogs can be resubmitted' });
    }

    // Change status to pending
    blog.status = 'pending';
    blog.reviewComment = null; // Clear previous rejection feedback
    blog.reviewedAt = null;
    
    await blog.save();

    res.json({
      message: 'Blog resubmitted successfully',
      blog
    });
  } catch (error) {
    console.error('Resubmit blog error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending blogs for review - Admin/Teacher only
exports.getPendingBlogs = async (req, res) => {
  try {
    const { communityId } = req.params;
    
    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Verify user has permission to review
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to review blogs' });
    }

    // Query based on role
    let query = { 
      community: communityId,
      status: 'pending'
    };
    
    // Teachers can only review student blogs
    if (!isAdmin) {
      query.authorRole = 'student';
    }

    // Get pending blogs
    const blogs = await Blog.find(query)
      .populate('author', 'name email role')
      .sort({ createdAt: 1 });
    
    res.json(blogs);
  } catch (error) {
    console.error('Get pending blogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search blogs
exports.searchBlogs = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Verify user belongs to community
    const userId = req.user.id;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Build query with permissions and tag search
    let query = { 
      community: communityId,
      tags: { $regex: keyword, $options: 'i' }
    };

    // Filter by permissions
    if (!isAdmin) {
      if (isTeacher) {
        query = {
          ...query,
          $and: [{
            $or: [
              { status: 'approved' },
              { author: userId },
              { status: 'pending', authorRole: 'student' }
            ]
          }]
        };
      } else {
        query = {
          ...query,
          $and: [{
            $or: [
              { status: 'approved' },
              { author: userId }
            ]
          }]
        };
      }
    }

    // Search blogs
    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(blogs);
  } catch (error) {
    console.error('Search blogs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Summarize blog content
exports.summarizeBlog = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Blog content is required' });
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create prompt for summarization
    const prompt = `Please provide a concise summary of the following blog post in 2-3 sentences:\n\n${content}`;

    // Generate summary
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (error) {
    console.error('Error in blog summarization:', error);
    res.status(500).json({ error: 'An error occurred while generating the summary' });
  }
}; 