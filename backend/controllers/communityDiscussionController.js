const CommunityDiscussion = require('../models/CommunityDiscussion');
const Community = require('../models/Community');
const Material = require('../models/Material');
const User = require('../models/User');

// Create a new discussion post or reply
exports.createDiscussion = async (req, res) => {
  try {
    console.log('=== CREATE DISCUSSION REQUEST ===');
    console.log('Community ID:', req.params.communityId);
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const { communityId } = req.params;
    const { 
      title, 
      content, 
      isQuestion, 
      tags, 
      referencedMaterials, 
      parentDiscussionId 
    } = req.body;
    
    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      console.log('ERROR: Community not found');
      return res.status(404).json({ message: 'Community not found' });
    }
    console.log('Community found:', community.name);

    // Check if user is member of the community
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    console.log('Membership check:', { isAdmin, isTeacher, isStudent });
    
    if (!isAdmin && !isTeacher && !isStudent) {
      console.log('ERROR: User not a member');
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      console.log('ERROR: Content is required');
      return res.status(400).json({ message: 'Content is required' });
    }

    // For top-level posts, title is required
    if (!parentDiscussionId && (!title || title.trim().length === 0)) {
      console.log('ERROR: Title is required for new discussions');
      return res.status(400).json({ message: 'Title is required for new discussions' });
    }

    // If this is a reply, check if parent discussion exists
    let parentDiscussion = null;
    if (parentDiscussionId) {
      console.log('Looking for parent discussion:', parentDiscussionId);
      parentDiscussion = await CommunityDiscussion.findById(parentDiscussionId);
      if (!parentDiscussion) {
        console.log('ERROR: Parent discussion not found');
        return res.status(404).json({ message: 'Parent discussion not found' });
      }
      
      if (parentDiscussion.community.toString() !== communityId) {
        console.log('ERROR: Parent discussion does not belong to this community');
        return res.status(400).json({ message: 'Parent discussion does not belong to this community' });
      }
      
      if (parentDiscussion.isDeleted) {
        console.log('ERROR: Cannot reply to deleted discussion');
        return res.status(400).json({ message: 'Cannot reply to deleted discussion' });
      }
      console.log('Parent discussion found:', parentDiscussion.title || parentDiscussion._id);
    }

    // Validate referenced materials
    let validatedMaterials = [];
    if (referencedMaterials && Array.isArray(referencedMaterials)) {
      console.log('Validating referenced materials:', referencedMaterials.length);
      for (const ref of referencedMaterials) {
        const material = await Material.findById(ref.material);
        if (material && material.community.toString() === communityId) {
          validatedMaterials.push({
            material: ref.material,
            note: ref.note || ''
          });
        }
      }
      console.log('Validated materials:', validatedMaterials.length);
    }

    // Process tags
    const tagArray = tags && Array.isArray(tags) ? tags.map(tag => tag.trim()) : 
                     tags ? tags.split(',').map(tag => tag.trim()) : [];
    console.log('Processed tags:', tagArray);

    // Create new discussion
    const newDiscussion = new CommunityDiscussion({
      community: communityId,
      author: userId,
      authorRole: userRole,
      title: parentDiscussionId ? undefined : title.trim(),
      content: content.trim(),
      isQuestion: parentDiscussionId ? false : (isQuestion !== undefined ? isQuestion : true),
      tags: tagArray,
      referencedMaterials: validatedMaterials,
      parentDiscussion: parentDiscussionId || null
    });

    console.log('Saving new discussion...');
    await newDiscussion.save();
    console.log('Discussion saved:', newDiscussion._id);

    // Add reply to parent discussion if applicable
    if (parentDiscussion) {
      console.log('Adding reply to parent...');
      parentDiscussion.replies.push(newDiscussion._id);
      await parentDiscussion.save();
      console.log('Parent updated');
    }

    // Populate author and material references
    console.log('Populating references...');
    await newDiscussion.populate([
      { path: 'author', select: 'name email role' },
      { path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
    ]);

    console.log('SUCCESS: Discussion created');
    res.status(201).json(newDiscussion);
  } catch (error) {
    console.error('=== CREATE DISCUSSION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all discussions for a community with sorting
exports.getCommunityDiscussions = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20, sortBy = 'recent', filterBy = 'all' } = req.query;
    
    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is member of the community
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    const skip = (page - 1) * limit;

    // Build filter query
    let filterQuery = {
      community: communityId,
      parentDiscussion: null,
      isDeleted: false
    };

    if (filterBy === 'questions') {
      filterQuery.isQuestion = true;
    } else if (filterBy === 'posts') {
      filterQuery.isQuestion = false;
    }

    // Build sort query
    let sortQuery = {};
    switch (sortBy) {
      case 'recent':
        sortQuery = { isPinned: -1, createdAt: -1 };
        break;
      case 'popular':
        sortQuery = { isPinned: -1, viewCount: -1, createdAt: -1 };
        break;
      case 'faculty':
        sortQuery = { isPinned: -1, authorRole: 1, createdAt: -1 };
        break;
      case 'unanswered':
        // For questions without marked answers
        filterQuery.isQuestion = true;
        sortQuery = { isPinned: -1, createdAt: -1 };
        break;
      default:
        sortQuery = { isPinned: -1, createdAt: -1 };
    }

    // Get discussions
    const discussions = await CommunityDiscussion.find(filterQuery)
      .populate('author', 'name email role')
      .populate('referencedMaterials.material', 'title fileType originalFileName fileUrl')
      .populate({
        path: 'replies',
        match: { isDeleted: false },
        options: { 
          sort: { 
            isMarkedAsAnswer: -1,
            authorRole: 1,  // admin(admin) < teacher(teacher) < student(student) alphabetically
            createdAt: 1    // older first for replies
          } 
        },
        populate: [
          { path: 'author', select: 'name email role' },
          { path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
        ]
      })
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    // Increment view count for each discussion (since they're being displayed)
    // Use Promise.all to increment all view counts concurrently
    await Promise.all(
      discussions.map(discussion => 
        CommunityDiscussion.findByIdAndUpdate(
          discussion._id,
          { $inc: { viewCount: 1 } },
          { new: false } // Don't return the updated document
        )
      )
    );

    // Update viewCount in the returned discussions to reflect the increment
    discussions.forEach(discussion => {
      discussion.viewCount = (discussion.viewCount || 0) + 1;
    });

    // Get total count for pagination
    const totalDiscussions = await CommunityDiscussion.countDocuments(filterQuery);

    res.json({
      discussions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalDiscussions / limit),
        total: totalDiscussions,
        limit: parseInt(limit)
      },
      filters: {
        sortBy,
        filterBy
      }
    });
  } catch (error) {
    console.error('Get community discussions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single discussion with all replies
exports.getDiscussionById = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('author', 'name email role')
      .populate('referencedMaterials.material', 'title fileType originalFileName fileUrl')
      .populate('markedAsAnswerBy', 'name')
      .populate({
        path: 'replies',
        match: { isDeleted: false },
        options: { 
          sort: { 
            isMarkedAsAnswer: -1,
            authorRole: 1,
            createdAt: 1
          } 
        },
        populate: [
          { path: 'author', select: 'name email role' },
          { path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' },
          { path: 'markedAsAnswerBy', select: 'name' }
        ]
      });
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.isDeleted) {
      return res.status(404).json({ message: 'Discussion has been deleted' });
    }

    // Check if user is member of the community
    const community = await Community.findById(discussion.community);
    const userId = req.user.id;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Increment view count
    await discussion.incrementView();

    res.json(discussion);
  } catch (error) {
    console.error('Get discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update discussion
exports.updateDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { title, content, tags, referencedMaterials } = req.body;
    
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('community');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.isDeleted) {
      return res.status(404).json({ message: 'Discussion has been deleted' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user is the author or admin/teacher
    const isAuthor = discussion.author.toString() === userId;
    const community = discussion.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAuthor && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to update this discussion' });
    }

    // Update fields
    if (title !== undefined && !discussion.parentDiscussion) {
      discussion.title = title.trim();
    }
    
    if (content !== undefined) {
      discussion.content = content.trim();
    }

    if (tags !== undefined) {
      discussion.tags = Array.isArray(tags) ? tags.map(tag => tag.trim()) : 
                        tags.split(',').map(tag => tag.trim());
    }

    // Validate and update referenced materials
    if (referencedMaterials !== undefined) {
      let validatedMaterials = [];
      for (const ref of referencedMaterials) {
        const material = await Material.findById(ref.material);
        if (material && material.community.toString() === discussion.community._id.toString()) {
          validatedMaterials.push({
            material: ref.material,
            note: ref.note || ''
          });
        }
      }
      discussion.referencedMaterials = validatedMaterials;
    }

    discussion.isEdited = true;
    discussion.editedAt = Date.now();
    
    await discussion.save();

    // Populate for response
    await discussion.populate([
      { path: 'author', select: 'name email role' },
      { path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
    ]);

    res.json(discussion);
  } catch (error) {
    console.error('Update discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete discussion (soft delete)
exports.deleteDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { reason } = req.body;
    
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('community')
      .populate('author', 'name role');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.isDeleted) {
      return res.status(404).json({ message: 'Discussion has already been deleted' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAuthor = discussion.author._id.toString() === userId;
    const community = discussion.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    // Get the author's role of the discussion being deleted
    const discussionAuthorRole = discussion.author.role;
    
    console.log('Delete attempt:', {
      userRole,
      discussionAuthorRole,
      isAuthor,
      isAdmin,
      isTeacher
    });
    
    // Permission logic:
    // Students: can only delete their own posts
    // Teachers: can delete their own posts + student posts (NOT admin posts)
    // Admins: can delete any post
    
    if (userRole === 'student') {
      if (!isAuthor) {
        return res.status(403).json({ message: 'Students can only delete their own posts' });
      }
    } else if (userRole === 'teacher') {
      if (!isAuthor && discussionAuthorRole === 'admin') {
        return res.status(403).json({ message: 'Teachers cannot delete admin posts' });
      }
      if (!isAuthor && discussionAuthorRole === 'teacher') {
        return res.status(403).json({ message: 'Teachers cannot delete other teacher posts' });
      }
      if (!isAuthor && !isTeacher) {
        return res.status(403).json({ message: 'You are not authorized to delete this discussion' });
      }
    } else if (userRole === 'admin') {
      // Admins can delete anything (no restrictions)
      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ message: 'You are not authorized to delete this discussion' });
      }
    } else {
      return res.status(403).json({ message: 'You are not authorized to delete this discussion' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason for deletion is required' });
    }

    await discussion.softDelete(userId, reason.trim());

    res.json({ 
      message: 'Discussion deleted successfully',
      deletedBy: userRole,
      reason: reason.trim()
    });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Like/Unlike a discussion
exports.toggleDiscussionLike = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await CommunityDiscussion.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.isDeleted) {
      return res.status(404).json({ message: 'Discussion has been deleted' });
    }

    // Check if user is member of the community
    const community = await Community.findById(discussion.community);
    const userId = req.user.id;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    await discussion.toggleLike(userId);
    await discussion.populate('author', 'name email role');

    res.json({
      message: 'Like toggled successfully',
      discussion,
      likeCount: discussion.likeCount
    });
  } catch (error) {
    console.error('Toggle discussion like error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark reply as answer (for questions)
exports.markAsAnswer = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('parentDiscussion')
      .populate('community');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!discussion.parentDiscussion) {
      return res.status(400).json({ message: 'Only replies can be marked as answers' });
    }

    const parentDiscussion = await CommunityDiscussion.findById(discussion.parentDiscussion);
    if (!parentDiscussion.isQuestion) {
      return res.status(400).json({ message: 'Can only mark answers for questions' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only question author, teachers, or admins can mark answers
    const isQuestionAuthor = parentDiscussion.author.toString() === userId;
    const community = discussion.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isQuestionAuthor && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'Only the question author or faculty can mark answers' });
    }

    // Toggle marked as answer
    discussion.isMarkedAsAnswer = !discussion.isMarkedAsAnswer;
    discussion.markedAsAnswerBy = discussion.isMarkedAsAnswer ? userId : null;
    
    await discussion.save();
    await discussion.populate([
      { path: 'author', select: 'name email role' },
      { path: 'markedAsAnswerBy', select: 'name' }
    ]);

    res.json({
      message: discussion.isMarkedAsAnswer ? 'Marked as answer' : 'Unmarked as answer',
      discussion
    });
  } catch (error) {
    console.error('Mark as answer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Pin/Unpin discussion (Faculty only)
exports.togglePinDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('community');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    const community = discussion.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'Only faculty can pin discussions' });
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.json({
      message: discussion.isPinned ? 'Discussion pinned' : 'Discussion unpinned',
      discussion
    });
  } catch (error) {
    console.error('Toggle pin discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search discussions
exports.searchDiscussions = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { keyword, tags } = req.query;
    
    if (!keyword && !tags) {
      return res.status(400).json({ message: 'Keyword or tags required for search' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user.id;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    let query = {
      community: communityId,
      isDeleted: false
    };

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    const discussions = await CommunityDiscussion.find(query)
      .populate('author', 'name email role')
      .populate('referencedMaterials.material', 'title fileType')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50);

    res.json(discussions);
  } catch (error) {
    console.error('Search discussions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get discussion statistics
exports.getDiscussionStats = async (req, res) => {
  try {
    const { communityId } = req.params;
    
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user.id;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    const totalDiscussions = await CommunityDiscussion.countDocuments({
      community: communityId,
      parentDiscussion: null,
      isDeleted: false
    });

    const totalQuestions = await CommunityDiscussion.countDocuments({
      community: communityId,
      parentDiscussion: null,
      isQuestion: true,
      isDeleted: false
    });

    const answeredQuestions = await CommunityDiscussion.countDocuments({
      community: communityId,
      parentDiscussion: null,
      isQuestion: true,
      isDeleted: false,
      replies: { $ne: [] }
    });

    const totalReplies = await CommunityDiscussion.countDocuments({
      community: communityId,
      parentDiscussion: { $ne: null },
      isDeleted: false
    });

    res.json({
      totalDiscussions,
      totalQuestions,
      answeredQuestions,
      unansweredQuestions: totalQuestions - answeredQuestions,
      totalReplies,
      totalPosts: totalDiscussions - totalQuestions
    });
  } catch (error) {
    console.error('Get discussion stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

