const express = require('express');
const router = express.Router();
const websiteDiscussionController = require('../controllers/websiteDiscussionController');
const auth = require('../middleware/auth');

// @route   POST /api/website-discussions
// @desc    Create a new discussion post or reply
// @access  Private (All authenticated users)
router.post('/', auth, websiteDiscussionController.createDiscussion);

// @route   GET /api/website-discussions/stats
// @desc    Get discussion statistics
// @access  Private (All authenticated users)
router.get('/stats', auth, websiteDiscussionController.getDiscussionStats);

// @route   GET /api/website-discussions/search
// @desc    Search discussions by keyword or tags
// @access  Private (All authenticated users)
// @query   keyword, tags
router.get('/search', auth, websiteDiscussionController.searchDiscussions);

// @route   PUT /api/website-discussions/update/:discussionId
// @desc    Update a discussion
// @access  Private (Author, Admin, or Teacher)
router.put('/update/:discussionId', auth, websiteDiscussionController.updateDiscussion);

// @route   DELETE /api/website-discussions/delete/:discussionId
// @desc    Delete a discussion (soft delete)
// @access  Private (Author, Admin, or Teacher)
router.delete('/delete/:discussionId', auth, websiteDiscussionController.deleteDiscussion);

// @route   POST /api/website-discussions/like/:discussionId
// @desc    Like/Unlike a discussion
// @access  Private (All authenticated users)
router.post('/like/:discussionId', auth, websiteDiscussionController.toggleDiscussionLike);

// @route   POST /api/website-discussions/mark-answer/:discussionId
// @desc    Mark a reply as answer (for questions)
// @access  Private (Question author, Teacher, or Admin)
router.post('/mark-answer/:discussionId', auth, websiteDiscussionController.markAsAnswer);

// @route   POST /api/website-discussions/pin/:discussionId
// @desc    Pin/Unpin a discussion (Faculty only)
// @access  Private (Teacher or Admin only)
router.post('/pin/:discussionId', auth, websiteDiscussionController.togglePinDiscussion);

// Parameterized routes come last
// @route   GET /api/website-discussions
// @desc    Get all discussions
// @access  Private (All authenticated users)
// @query   page, limit, sortBy (recent|popular|faculty|unanswered), filterBy (all|questions|posts)
router.get('/', auth, websiteDiscussionController.getWebsiteDiscussions);

// @route   GET /api/website-discussions/:discussionId
// @desc    Get single discussion with all replies
// @access  Private (All authenticated users)
router.get('/:discussionId', auth, websiteDiscussionController.getDiscussionById);

module.exports = router;