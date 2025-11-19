const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Community = require('../models/Community');
const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Create a new event
// @route   POST /api/communities/:communityId/events
// @access  Private (Members of that community)
const createEvent = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const { title, description, links, location, date, time } = req.body;

  const community = await Community.findById(communityId);

  if (!community) {
    res.status(404);
    throw new Error('Community not found');
  }

  // Debugging logs
  console.log('req.user.id:', req.user.id, 'type:', typeof req.user.id);
  console.log('community.admin:', community.admin, 'type:', typeof community.admin);
  console.log('community.teachers:', community.teachers.map(t => ({id: t, type: typeof t})));
  console.log('community.students:', community.students.map(s => ({id: s, type: typeof s})));

  // Check if the authenticated user is a member of this community
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const isMember = community.admin.equals(userId) ||
                   community.teachers.some(teacher => teacher.equals(userId)) ||
                   community.students.some(student => student.equals(userId));

  console.log('isMember check result:', isMember);

  if (!isMember) {
    res.status(403);
    throw new Error('Not authorized to create events in this community');
  }

  const event = new Event({
    community: communityId,
    title,
    description,
    links,
    location,
    date,
    time,
    creator: req.user.id, // The authenticated user is the creator
  });

  const createdEvent = await event.save();

  // Optionally, add the event to the community's events array if you want to store events in community model
  // community.events.push(createdEvent._id);
  // await community.save();

  res.status(201).json(createdEvent);
});

// @desc    Get all events for a community
// @route   GET /api/communities/:communityId/events
// @access  Private (Members only of that community)
const getCommunityEvents = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  const community = await Community.findById(communityId);

  if (!community) {
    res.status(404);
    throw new Error('Community not found');
  }

  // Check if the user is a member of the community
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const isMember = community.admin.equals(userId) ||
                   community.teachers.some(teacher => teacher.equals(userId)) ||
                   community.students.some(student => student.equals(userId));

  if (!isMember) {
    res.status(403);
    throw new Error('Not authorized to view events in this community');
  }

  const events = await Event.find({ community: communityId }).populate('creator', 'name email');

  res.json(events);
});

module.exports = {
  createEvent,
  getCommunityEvents,
}; 