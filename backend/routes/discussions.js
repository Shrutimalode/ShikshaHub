const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');
const auth = require('../middleware/auth');

// @route   POST api/discussions/blog/:blogId
// @desc    Create a new comment on a blog
// @access  Private
router.post('/blog/:blogId', auth, discussionController.createComment);

// @route   GET api/discussions/blog/:blogId
// @desc    Get all comments for a blog
// @access  Private
router.get('/blog/:blogId', auth, discussionController.getBlogComments);

// @route   PUT api/discussions/:commentId
// @desc    Update a comment
// @access  Private (Author only)
router.put('/:commentId', auth, discussionController.updateComment);

// @route   DELETE api/discussions/:commentId
// @desc    Delete a comment (soft delete)
// @access  Private (Author, Admin, or Teacher)
router.delete('/:commentId', auth, discussionController.deleteComment);

// @route   POST api/discussions/:commentId/like
// @desc    Like/Unlike a comment
// @access  Private
router.post('/:commentId/like', auth, discussionController.toggleCommentLike);

// @route   GET api/discussions/blog/:blogId/stats
// @desc    Get comment statistics for a blog
// @access  Private
router.get('/blog/:blogId/stats', auth, discussionController.getCommentStats);

// @route   GET api/discussions/user/:userId
// @desc    Get all comments by a user
// @access  Private
router.get('/user/:userId', auth, discussionController.getUserComments);

// Admin routes for institutional security
// @route   POST api/discussions/bulk-delete
// @desc    Bulk delete comments (Admin only)
// @access  Private (Admin only)
router.post('/bulk-delete', auth, discussionController.bulkDeleteComments);

// @route   GET api/discussions/moderation/:communityId
// @desc    Get moderation dashboard data
// @access  Private (Admin or Teacher only)
router.get('/moderation/:communityId', auth, discussionController.getModerationDashboard);

// @route   POST api/discussions/:commentId/restore
// @desc    Restore a deleted comment (Admin only)
// @access  Private (Admin only)
router.post('/:commentId/restore', auth, discussionController.restoreComment);

// @route   POST api/discussions/:commentId/pin
// @desc    Pin/Unpin a comment (Faculty only)
// @access  Private (Teacher or Admin only)
router.post('/:commentId/pin', auth, discussionController.togglePinComment);

// @route   POST api/discussions/:commentId/verify
// @desc    Mark comment as verified answer (Admin only)
// @access  Private (Admin only)
router.post('/:commentId/verify', auth, discussionController.toggleVerifiedAnswer);

module.exports = router;
