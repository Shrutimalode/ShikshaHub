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
      
      if (parentDiscussion.isTerminated) {
        console.log('ERROR: Cannot reply to terminated discussion');
        return res.status(400).json({ message: 'Cannot reply to terminated discussion' });
      }
      console.log('Parent discussion found:', parentDiscussion.title || parentDiscussion._id);
      
      // Update last activity for parent discussion when replying
      await parentDiscussion.updateLastActivity();
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

// Get all discussions for a community with sorting (for "All Discussions" tab - titles only)
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
        sortQuery = { isPinned: -1, lastActivityAt: -1 };
        break;
      case 'popular':
        sortQuery = { isPinned: -1, viewCount: -1, lastActivityAt: -1 };
        break;
      case 'faculty':
        sortQuery = { isPinned: -1, authorRole: 1, lastActivityAt: -1 };
        break;
      case 'unanswered':
        // For questions without marked answers
        filterQuery.isQuestion = true;
        sortQuery = { isPinned: -1, lastActivityAt: -1 };
        break;
      default:
        sortQuery = { isPinned: -1, lastActivityAt: -1 };
    }

    // Get discussions (titles only for "All Discussions" view)
    const discussions = await CommunityDiscussion.find(filterQuery)
      .populate('author', 'name email role')
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

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

// Get single discussion with all replies (including nested replies)
exports.getDiscussionById = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    // Simple approach: populate replies up to 5 levels deep
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
          { path: 'markedAsAnswerBy', select: 'name' },
          {
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
              { path: 'markedAsAnswerBy', select: 'name' },
              {
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
              }
            ]
          }
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
    
    // Log the structure for debugging
    console.log('Discussion replies structure:');
    if (discussion.replies && discussion.replies.length > 0) {
      discussion.replies.forEach((reply, index) => {
        console.log(`Reply ${index + 1}:`, reply._id);
        if (reply.replies && reply.replies.length > 0) {
          console.log(`  Nested replies:`, reply.replies.length);
          reply.replies.forEach((nestedReply, nestedIndex) => {
            console.log(`    Nested Reply ${nestedIndex + 1}:`, nestedReply._id);
          });
        }
      });
    }

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

    // If marking as answer (not unmarking), terminate the chat
    if (discussion.isMarkedAsAnswer) {
      await parentDiscussion.terminateChat('Question marked as answered');
      await parentDiscussion.populate([
        { path: 'author', select: 'name email role' },
        { path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
      ]);
    }

    res.json({
      message: discussion.isMarkedAsAnswer ? 'Marked as answer and chat terminated' : 'Unmarked as answer',
      discussion,
      parentDiscussion: discussion.isMarkedAsAnswer ? parentDiscussion : undefined
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

// Add a new controller method to get active chats with full details (for "Active Chats" tab)
exports.getActiveChats = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
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

    // Build filter query for active chats (not terminated, not deleted)
    let filterQuery = {
      community: communityId,
      parentDiscussion: null,
      isDeleted: false,
      isTerminated: false
    };

    // Get active discussions with replies
    const discussions = await CommunityDiscussion.find(filterQuery)
      .populate('author', 'name email role')
      .populate('referencedMaterials.material', 'title fileType originalFileName fileUrl')
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
      })
      .sort({ lastActivityAt: -1 }) // Sort by last activity
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalDiscussions = await CommunityDiscussion.countDocuments(filterQuery);

    res.json({
      discussions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalDiscussions / limit),
        total: totalDiscussions,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get active chats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a new controller method to terminate old chats
exports.terminateOldChats = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { daysOld = 30 } = req.body; // Default to 30 days
    
    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin or teacher
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'Only faculty can terminate old chats' });
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find and terminate old chats
    const result = await CommunityDiscussion.updateMany(
      {
        community: communityId,
        parentDiscussion: null,
        isDeleted: false,
        isTerminated: false,
        lastActivityAt: { $lt: cutoffDate }
      },
      {
        $set: {
          isTerminated: true,
          terminatedAt: new Date(),
          terminationReason: `Automatically terminated after ${daysOld} days of inactivity`
        }
      }
    );

    res.json({
      message: `Terminated ${result.modifiedCount} old chats`,
      terminatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Terminate old chats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Test endpoint to create nested replies for debugging
exports.createTestReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content, parentReplyId } = req.body;
    
    // Find the parent discussion or reply
    const parent = await CommunityDiscussion.findById(parentReplyId || discussionId);
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    
    // Create new reply
    const newReply = new CommunityDiscussion({
      community: parent.community,
      author: req.user.id,
      authorRole: req.user.role,
      content: content,
      parentDiscussion: parentReplyId || discussionId
    });
    
    await newReply.save();
    
    // Add reply to parent
    parent.replies.push(newReply._id);
    await parent.save();
    
    // Populate the new reply
    await newReply.populate('author', 'name email role');
    
    res.status(201).json(newReply);
  } catch (error) {
    console.error('Create test reply error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Test endpoint to check reply structure
exports.testReplyStructure = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    // Get the discussion with minimal population
    const discussion = await CommunityDiscussion.findById(discussionId)
      .populate('replies');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Log the raw structure
    console.log('Raw discussion structure:', {
      _id: discussion._id,
      title: discussion.title,
      replies: discussion.replies.map(reply => ({
        _id: reply._id,
        content: reply.content,
        replies: reply.replies
      }))
    });
    
    res.json({
      _id: discussion._id,
      title: discussion.title,
      replies: discussion.replies.map(reply => ({
        _id: reply._id,
        content: reply.content,
        replies: reply.replies
      }))
    });
  } catch (error) {
    console.error('Test reply structure error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




































