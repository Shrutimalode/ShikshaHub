const express = require('express');
const router = express.Router();
const communityDiscussionController = require('../controllers/communityDiscussionController');
const auth = require('../middleware/auth');

// @route   POST /api/community-discussions/:communityId
// @desc    Create a new discussion post or reply
// @access  Private (Community members only)
router.post('/:communityId', auth, communityDiscussionController.createDiscussion);

// @route   POST /api/community-discussions/test-reply/:discussionId
// @desc    Create a test reply for debugging
// @access  Private (Community members only)
router.post('/test-reply/:discussionId', auth, communityDiscussionController.createTestReply);

// @route   GET /api/community-discussions/test-structure/:discussionId
// @desc    Test reply structure for debugging
// @access  Private (Community members only)
router.get('/test-structure/:discussionId', auth, communityDiscussionController.testReplyStructure);

// Specific routes MUST come before parameterized routes
// @route   GET /api/community-discussions/stats/:communityId
// @desc    Get discussion statistics for a community
// @access  Private (Community members only)
router.get('/stats/:communityId', auth, communityDiscussionController.getDiscussionStats);

// @route   GET /api/community-discussions/search/:communityId
// @desc    Search discussions by keyword or tags
// @access  Private (Community members only)
// @query   keyword, tags
router.get('/search/:communityId', auth, communityDiscussionController.searchDiscussions);

// @route   GET /api/community-discussions/active/:communityId
// @desc    Get active chats for a community (for tabbed interface)
// @access  Private (Community members only)
router.get('/active/:communityId', auth, communityDiscussionController.getActiveChats);

// @route   POST /api/community-discussions/terminate-old/:communityId
// @desc    Terminate old chats based on inactivity
// @access  Private (Faculty only)
router.post('/terminate-old/:communityId', auth, communityDiscussionController.terminateOldChats);

// @route   PUT /api/community-discussions/update/:discussionId
// @desc    Update a discussion
// @access  Private (Author, Admin, or Teacher)
router.put('/update/:discussionId', auth, communityDiscussionController.updateDiscussion);

// @route   DELETE /api/community-discussions/delete/:discussionId
// @desc    Delete a discussion (soft delete)
// @access  Private (Author, Admin, or Teacher)
router.delete('/delete/:discussionId', auth, communityDiscussionController.deleteDiscussion);

// @route   POST /api/community-discussions/like/:discussionId
// @desc    Like/Unlike a discussion
// @access  Private (Community members only)
router.post('/like/:discussionId', auth, communityDiscussionController.toggleDiscussionLike);

// @route   POST /api/community-discussions/mark-answer/:discussionId
// @desc    Mark a reply as answer (for questions)
// @access  Private (Question author, Teacher, or Admin)
router.post('/mark-answer/:discussionId', auth, communityDiscussionController.markAsAnswer);

// @route   POST /api/community-discussions/pin/:discussionId
// @desc    Pin/Unpin a discussion (Faculty only)
// @access  Private (Teacher or Admin only)
router.post('/pin/:discussionId', auth, communityDiscussionController.togglePinDiscussion);

// Parameterized routes come last
// @route   GET /api/community-discussions/:communityId
// @desc    Get all discussions for a community
// @access  Private (Community members only)
// @query   page, limit, sortBy (recent|popular|faculty|unanswered), filterBy (all|questions|posts)
router.get('/:communityId', auth, communityDiscussionController.getCommunityDiscussions);

// @route   GET /api/community-discussions/:communityId/:discussionId
// @desc    Get single discussion with all replies
// @access  Private (Community members only)
router.get('/:communityId/:discussionId', auth, communityDiscussionController.getDiscussionById);

module.exports = router;