const Discussion = require('../models/Discussion');
const Blog = require('../models/Blog');
const Community = require('../models/Community');
const User = require('../models/User');

// Helper function to build nested reply tree
const buildReplyTree = (replies, allRepliesMap, depth = 0) => {
  if (depth > 5) return replies; // Limit nesting depth to prevent infinite recursion
  
  return replies.map(reply => {
    const populatedReply = allRepliesMap.get(reply._id.toString()) || reply;
    if (populatedReply.replies && populatedReply.replies.length > 0) {
      return {
        ...populatedReply.toObject ? populatedReply.toObject() : populatedReply,
        replies: buildReplyTree(populatedReply.replies, allRepliesMap, depth + 1)
      };
    }
    return populatedReply.toObject ? populatedReply.toObject() : populatedReply;
  });
};

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { content, parentCommentId } = req.body;
    
    // Check if blog exists
    const blog = await Blog.findById(blogId)
      .populate('community');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is member of the community
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const community = blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Check if blog is approved (only approved blogs can have discussions)
    if (blog.status !== 'approved') {
      return res.status(403).json({ message: 'Discussions are only allowed on approved blog posts' });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ message: 'Comment content cannot exceed 2000 characters' });
    }

    // If this is a reply, check if parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Discussion.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      
      if (parentComment.blog.toString() !== blogId) {
        return res.status(400).json({ message: 'Parent comment does not belong to this blog' });
      }
      
      if (parentComment.isDeleted) {
        return res.status(400).json({ message: 'Cannot reply to deleted comment' });
      }
    }

    // Create new comment
    const newComment = new Discussion({
      blog: blogId,
      author: userId,
      authorRole: userRole,
      content: content.trim(),
      parentComment: parentCommentId || null
    });

    // Set faculty flags explicitly to ensure they're set correctly
    newComment.isFacultyReply = userRole === 'teacher' || userRole === 'admin';
    newComment.isPinned = newComment.isFacultyReply; // Auto-pin faculty replies
    newComment.isVerifiedAnswer = userRole === 'admin'; // Admin replies are verified answers

    await newComment.save();

    // Add reply to parent comment if applicable
    if (parentComment) {
      parentComment.replies.push(newComment._id);
      await parentComment.save();
    }

    // Populate author info for response
    await newComment.populate('author', 'name email');

    // Log faculty reply creation for monitoring
    if (newComment.isFacultyReply) {
      console.log(`Faculty reply created: ${newComment._id}, Author: ${userRole}, Parent: ${parentCommentId || 'top-level'}`);
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all comments for a blog
exports.getBlogComments = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Check if blog exists
    const blog = await Blog.findById(blogId)
      .populate('community');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is member of the community
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const community = blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Only show comments for approved blogs
    if (blog.status !== 'approved') {
      return res.status(403).json({ message: 'Comments are only available for approved blog posts' });
    }

    const skip = (page - 1) * limit;

    // Get top-level comments (no parent) with nested replies
    const topLevelComments = await Discussion.find({
      blog: blogId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'name email')
      .sort({ 
        isVerifiedAnswer: -1,  // Verified answers first
        isFacultyReply: -1,    // Faculty replies second
        isPinned: -1,          // Then pinned comments
        createdAt: -1          // Then by creation time (newest first)
      })
      .skip(skip)
      .limit(parseInt(limit));

    // Get all replies for these comments
    const topLevelCommentIds = topLevelComments.map(comment => comment._id);
    
    // Get all replies (up to 5 levels deep) for the top-level comments
    const allReplies = await Discussion.find({
      blog: blogId,
      parentComment: { $ne: null },
      isDeleted: false
    })
      .populate('author', 'name email')
      .sort({ 
        isVerifiedAnswer: -1,
        isFacultyReply: -1,
        isPinned: -1,
        createdAt: 1  // Oldest first for replies to maintain conversation flow
      });

    // Create a map for quick lookup of replies
    const allRepliesMap = new Map();
    allReplies.forEach(reply => {
      allRepliesMap.set(reply._id.toString(), reply);
    });

    // Build nested reply structure for each top-level comment
    const commentsWithReplies = topLevelComments.map(comment => {
      // Find direct replies to this comment
      const directReplies = allReplies.filter(reply => 
        reply.parentComment && reply.parentComment.toString() === comment._id.toString()
      );
      
      return {
        ...comment.toObject(),
        replies: buildReplyTree(directReplies, allRepliesMap, 0)
      };
    });

    // Get total count for pagination
    const totalComments = await Discussion.countDocuments({
      blog: blogId,
      parentComment: null,
      isDeleted: false
    });

    // Log faculty reply statistics for monitoring
    const facultyReplyCount = commentsWithReplies.reduce((count, comment) => {
      return count + (comment.isFacultyReply ? 1 : 0) + 
             (comment.replies ? comment.replies.filter(reply => reply.isFacultyReply).length : 0);
    }, 0);
    
    if (facultyReplyCount > 0) {
      console.log(`Retrieved ${facultyReplyCount} faculty replies for blog ${blogId}`);
    }

    res.json({
      comments: commentsWithReplies,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalComments / limit),
        total: totalComments,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get blog comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a comment
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    // Find comment
    const comment = await Discussion.findById(commentId)
      .populate('blog')
      .populate('author')
      .populate({
        path: 'blog',
        populate: {
          path: 'community'
        }
      });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(404).json({ message: 'Comment has been deleted' });
    }

    // Check if blog is still approved (can't edit comments on non-approved blogs)
    if (comment.blog.status !== 'approved') {
      return res.status(403).json({ message: 'Cannot edit comments on non-approved blog posts' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user is the author OR admin/teacher in the community
    const isAuthor = comment.author._id.toString() === userId;
    
    // Check admin/teacher privileges in the community
    const community = comment.blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAuthor && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to update this comment' });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ message: 'Comment content cannot exceed 2000 characters' });
    }

    // Store original content for audit trail (optional - for admin edits)
    const originalContent = comment.content;
    
    // Update comment
    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = Date.now();
    
    // Add audit information for admin/teacher edits
    if (!isAuthor) {
      comment.lastEditedBy = userId;
      comment.lastEditedByRole = userRole;
      comment.editReason = req.body.editReason || 'Edited by moderator';
    }
    
    const updatedComment = await comment.save();

    // Populate author info for response
    await updatedComment.populate('author', 'name email');

    res.json({
      ...updatedComment.toObject(),
      editAudit: {
        wasEditedByAdmin: !isAuthor,
        editedBy: isAuthor ? 'author' : (isAdmin ? 'admin' : 'teacher'),
        originalContent: isAuthor ? undefined : originalContent
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a comment (soft delete)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, deleteType = 'soft' } = req.body;
    
    // Find comment
    const comment = await Discussion.findById(commentId)
      .populate('blog')
      .populate('author')
      .populate({
        path: 'blog',
        populate: {
          path: 'community'
        }
      });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(404).json({ message: 'Comment has already been deleted' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user is author or admin/teacher
    const isAuthor = comment.author._id.toString() === userId;
    
    // Check if user is admin or teacher in the community
    const community = comment.blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAuthor && !isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to delete this comment' });
    }

    // Validate reason for deletion
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason for deletion is required for institutional security' });
    }

    // Additional validation for admin/teacher deletions
    if (!isAuthor && reason.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide a detailed reason for deletion (minimum 10 characters)' });
    }

    // Determine deletion type based on user role and severity
    const finalDeleteType = (isAdmin && deleteType === 'hard') ? 'hard' : 'soft';

    if (finalDeleteType === 'hard' && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can perform hard deletion' });
    }

    // Perform deletion
    if (finalDeleteType === 'hard') {
      // Hard delete - remove from database completely
      await Discussion.findByIdAndDelete(commentId);
      
      // Also remove from parent comment's replies array if it exists
      if (comment.parentComment) {
        await Discussion.findByIdAndUpdate(
          comment.parentComment,
          { $pull: { replies: commentId } }
        );
      }
    } else {
      // Soft delete
      await comment.softDelete(userId, reason.trim());
    }

    // Log the deletion for audit purposes
    console.log(`Comment ${commentId} deleted by ${userRole} (${userId}): ${reason}`);

    res.json({ 
      message: `Comment ${finalDeleteType === 'hard' ? 'permanently deleted' : 'deleted successfully'}`,
      deletionType: finalDeleteType,
      deletedBy: userRole,
      reason: reason.trim()
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Like/Unlike a comment
exports.toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Find comment
    const comment = await Discussion.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(404).json({ message: 'Comment has been deleted' });
    }

    // Check if user is member of the community
    const blog = await Blog.findById(comment.blog).populate('community');
    const community = blog.community;
    const userId = req.user.id;
    
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Toggle like
    await comment.toggleLike(userId);
    
    // Populate author for response
    await comment.populate('author', 'name email');

    res.json({
      message: 'Like toggled successfully',
      comment,
      likeCount: comment.likeCount
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get comment statistics for a blog
exports.getCommentStats = async (req, res) => {
  try {
    const { blogId } = req.params;
    
    // Check if blog exists
    const blog = await Blog.findById(blogId)
      .populate('community');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user is member of the community
    const userId = req.user.id;
    
    const community = blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    const isStudent = community.students.some(studentId => studentId.toString() === userId);
    
    if (!isAdmin && !isTeacher && !isStudent) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Get comment statistics
    const totalComments = await Discussion.countDocuments({
      blog: blogId,
      isDeleted: false
    });

    const topLevelComments = await Discussion.countDocuments({
      blog: blogId,
      parentComment: null,
      isDeleted: false
    });

    const replies = await Discussion.countDocuments({
      blog: blogId,
      parentComment: { $ne: null },
      isDeleted: false
    });

    res.json({
      totalComments,
      topLevelComments,
      replies,
      discussionsEnabled: blog.status === 'approved'
    });
  } catch (error) {
    console.error('Get comment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's comments across all blogs
exports.getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;

    // Get user's comments
    const comments = await Discussion.find({
      author: userId,
      isDeleted: false
    })
      .populate('author', 'name email')
      .populate({
        path: 'blog',
        select: 'title status',
        populate: {
          path: 'community',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalComments = await Discussion.countDocuments({
      author: userId,
      isDeleted: false
    });

    res.json({
      comments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalComments / limit),
        total: totalComments,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Bulk delete comments (for institutional security)
exports.bulkDeleteComments = async (req, res) => {
  try {
    const { commentIds, reason, deleteType = 'soft' } = req.body;
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ message: 'Comment IDs array is required' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Detailed reason is required for bulk deletion (minimum 10 characters)' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only admins can perform bulk operations
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can perform bulk deletion operations' });
    }

    let deletedCount = 0;
    let failedDeletions = [];

    for (const commentId of commentIds) {
      try {
        const comment = await Discussion.findById(commentId)
          .populate({
            path: 'blog',
            populate: {
              path: 'community'
            }
          });

        if (!comment) {
          failedDeletions.push({ commentId, error: 'Comment not found' });
          continue;
        }

        if (comment.isDeleted) {
          failedDeletions.push({ commentId, error: 'Already deleted' });
          continue;
        }

        // Verify admin has permission in this community
        const community = comment.blog.community;
        const isAdmin = community.admin.toString() === userId;
        
        if (!isAdmin) {
          failedDeletions.push({ commentId, error: 'No permission in this community' });
          continue;
        }

        // Perform deletion
        if (deleteType === 'hard') {
          await Discussion.findByIdAndDelete(commentId);
          
          // Remove from parent comment's replies array if it exists
          if (comment.parentComment) {
            await Discussion.findByIdAndUpdate(
              comment.parentComment,
              { $pull: { replies: commentId } }
            );
          }
        } else {
          await comment.softDelete(userId, reason.trim());
        }

        deletedCount++;
        
        // Log for audit
        console.log(`Bulk delete: Comment ${commentId} deleted by admin ${userId}: ${reason}`);
        
      } catch (error) {
        console.error(`Error deleting comment ${commentId}:`, error);
        failedDeletions.push({ commentId, error: 'Deletion failed' });
      }
    }

    res.json({
      message: `Bulk deletion completed. ${deletedCount} comments deleted.`,
      deletedCount,
      failedCount: failedDeletions.length,
      failedDeletions,
      deletionType: deleteType,
      reason: reason.trim()
    });
  } catch (error) {
    console.error('Bulk delete comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get moderation dashboard data
exports.getModerationDashboard = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only admins and teachers can access moderation dashboard
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Admin or teacher role required.' });
    }

    // Verify community exists and user has permission
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to moderate this community' });
    }

    const skip = (page - 1) * limit;

    // Get recent comments for moderation
    const recentComments = await Discussion.find({
      blog: { $in: await Blog.find({ community: communityId }).distinct('_id') },
      isDeleted: false
    })
      .populate('author', 'name email role')
      .populate({
        path: 'blog',
        select: 'title status',
        populate: {
          path: 'community',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get moderation statistics
    const totalComments = await Discussion.countDocuments({
      blog: { $in: await Blog.find({ community: communityId }).distinct('_id') },
      isDeleted: false
    });

    const deletedComments = await Discussion.countDocuments({
      blog: { $in: await Blog.find({ community: communityId }).distinct('_id') },
      isDeleted: true
    });

    const flaggedComments = await Discussion.countDocuments({
      blog: { $in: await Blog.find({ community: communityId }).distinct('_id') },
      isDeleted: false,
      // Add flagging logic here if you implement content flagging
    });

    res.json({
      recentComments,
      statistics: {
        totalComments,
        deletedComments,
        flaggedComments,
        activeDiscussions: totalComments - deletedComments
      },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalComments / limit),
        total: totalComments,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get moderation dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Restore deleted comment
exports.restoreComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only admins can restore deleted comments
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can restore deleted comments' });
    }

    const comment = await Discussion.findById(commentId)
      .populate({
        path: 'blog',
        populate: {
          path: 'community'
        }
      });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!comment.isDeleted) {
      return res.status(400).json({ message: 'Comment is not deleted' });
    }

    // Verify admin has permission in this community
    const community = comment.blog.community;
    const isAdmin = community.admin.toString() === userId;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to restore comments in this community' });
    }

    // Restore the comment
    await comment.restore();

    // Log for audit
    console.log(`Comment ${commentId} restored by admin ${userId}: ${reason || 'No reason provided'}`);

    res.json({
      message: 'Comment restored successfully',
      comment,
      restoredBy: userRole,
      reason: reason || 'No reason provided'
    });
  } catch (error) {
    console.error('Restore comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Faculty: Pin/Unpin comment
exports.togglePinComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only teachers and admins can pin/unpin comments
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Only faculty members can pin comments' });
    }

    const comment = await Discussion.findById(commentId)
      .populate('author', 'name email')
      .populate({
        path: 'blog',
        populate: {
          path: 'community'
        }
      });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(404).json({ message: 'Cannot pin deleted comment' });
    }

    // Verify user has permission in this community
    const community = comment.blog.community;
    const isAdmin = community.admin.toString() === userId;
    const isTeacher = community.teachers.some(teacherId => teacherId.toString() === userId);
    
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ message: 'You are not authorized to pin comments in this community' });
    }

    // Toggle pin status
    comment.isPinned = !comment.isPinned;
    await comment.save();

    // Log for audit
    console.log(`Comment ${commentId} ${comment.isPinned ? 'pinned' : 'unpinned'} by ${userRole} ${userId}`);

    res.json({
      message: `Comment ${comment.isPinned ? 'pinned' : 'unpinned'} successfully`,
      comment,
      action: comment.isPinned ? 'pinned' : 'unpinned',
      actionBy: userRole
    });
  } catch (error) {
    console.error('Toggle pin comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Mark comment as verified answer
exports.toggleVerifiedAnswer = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only admins can mark comments as verified answers
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can mark comments as verified answers' });
    }

    const comment = await Discussion.findById(commentId)
      .populate('author', 'name email')
      .populate({
        path: 'blog',
        populate: {
          path: 'community'
        }
      });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(404).json({ message: 'Cannot mark deleted comment as verified answer' });
    }

    // Verify admin has permission in this community
    const community = comment.blog.community;
    const isAdmin = community.admin.toString() === userId;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to mark comments as verified answers in this community' });
    }

    // Toggle verified answer status
    comment.isVerifiedAnswer = !comment.isVerifiedAnswer;
    
    // If marking as verified, also pin it
    if (comment.isVerifiedAnswer) {
      comment.isPinned = true;
    }
    
    await comment.save();

    // Log for audit
    console.log(`Comment ${commentId} ${comment.isVerifiedAnswer ? 'marked as verified answer' : 'unmarked as verified answer'} by admin ${userId}`);

    res.json({
      message: `Comment ${comment.isVerifiedAnswer ? 'marked as verified answer' : 'unmarked as verified answer'} successfully`,
      comment,
      action: comment.isVerifiedAnswer ? 'verified' : 'unverified',
      actionBy: userRole
    });
  } catch (error) {
    console.error('Toggle verified answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
