const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { createEvent, getCommunityEvents } = require('../controllers/eventController');
const auth = require('../middleware/auth');

// @route   POST api/communities
// @desc    Create a new community (admin only)
// @access  Private
router.post('/', auth, communityController.createCommunity);

// @route   GET api/communities
// @desc    Get all communities
// @access  Private
router.get('/', auth, communityController.getAllCommunities);

// @route   GET api/communities/search
// @desc    Search communities
// @access  Private
router.get('/search', auth, communityController.searchCommunities);

// @route   GET api/communities/:id
// @desc    Get community by ID
// @access  Private
router.get('/:id', auth, communityController.getCommunityById);

// @route   POST api/communities/join
// @desc    Join a community with join code
// @access  Private
router.post('/join', auth, communityController.joinCommunity);

// @route   POST api/communities/request
// @desc    Request to join a community
// @access  Private
router.post('/request', auth, communityController.requestToJoin);

// @route   PUT api/communities/request/handle
// @desc    Handle join request (admin only)
// @access  Private
router.put('/request/handle', auth, communityController.handleJoinRequest);

// @route   GET api/communities/:communityId/requests
// @desc    Get join requests for a community (admin only)
// @access  Private
router.get('/:communityId/requests', auth, communityController.getJoinRequests);

// @route   DELETE api/communities/:id
// @desc    Delete community (admin only)
// @access  Private
router.delete('/:id', auth, communityController.deleteCommunity);

// @route   PUT api/communities/members/remove
// @desc    Remove member from community (admin only)
// @access  Private
router.put('/members/remove', auth, communityController.removeMember);

// @route   POST api/communities/:communityId/leave
// @desc    Leave a community
// @access  Private
router.post('/:communityId/leave', auth, communityController.leaveCommunity);

// Event routes for a specific community
router.route('/:communityId/events')
  .post(auth, createEvent) // Create a new event (admin only)
  .get(auth, getCommunityEvents); // Get all events for a community (members only)

module.exports = router; 