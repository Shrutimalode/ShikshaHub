const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const globalForumController = require('../controllers/globalForumController');

// Thread routes
router.post('/threads', auth, globalForumController.createThread);
router.get('/threads', auth, globalForumController.getThreads);
router.get('/threads/:threadId', auth, globalForumController.getThreadById);
router.put('/threads/:threadId/moderators', auth, globalForumController.updateThreadModerators);
router.delete('/threads/:threadId', auth, globalForumController.deleteThread);

// Teacher/Moderator selection
router.get('/teachers', auth, globalForumController.getTeachersForModeration);

// Discussion routes
router.post('/threads/:threadId/questions', auth, globalForumController.postQuestion);
router.post('/threads/:threadId/discussions/:discussionId/replies', auth, globalForumController.postReply);
router.get('/threads/:threadId/discussions', auth, globalForumController.getThreadDiscussions);

// Moderation routes
router.post('/discussions/:discussionId/moderate', auth, globalForumController.moderateDiscussion);
router.get('/threads/:threadId/pending', auth, globalForumController.getPendingModeration);

// Mark as answer
router.post('/discussions/:discussionId/mark-answer', auth, globalForumController.markAsAnswer);

// Like/Unlike
router.post('/discussions/:discussionId/like', auth, globalForumController.toggleLike);

// Delete discussion/reply
router.delete('/discussions/:discussionId', auth, globalForumController.deleteDiscussion);

// User expertise
router.put('/user/expertise', auth, globalForumController.updateExpertise);

// Get moderator threads
router.get('/user/moderator-threads', auth, globalForumController.getModeratorThreads);

module.exports = router;
