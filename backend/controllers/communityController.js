const Community = require('../models/Community');
const User = require('../models/User');

// Create a new community (admin only)
exports.createCommunity = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Only admin can create communities
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create communities' });
    }

    // Generate a unique join code
    const joinCode = Community.generateJoinCode();

    const newCommunity = new Community({
      name,
      description,
      joinCode,
      admin: req.user.id,
      teachers: [],
      students: []
    });

    await newCommunity.save();

    // Add community to admin's communities
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { communities: newCommunity._id } }
    );

    res.status(201).json(newCommunity);
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all communities
exports.getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('admin', 'name')
      .select('name description admin students teachers createdAt');
    
    res.json(communities);
  } catch (error) {
    console.error('Get all communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get community by ID
exports.getCommunityById = async (req, res) => {
  try {
    console.log('Getting community by ID:', req.params.id);
    console.log('User requesting:', req.user);
    
    const community = await Community.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('teachers', 'name email')
      .populate('students', 'name email')
      .populate('joinRequests.user', 'name email role')
      .populate({
        path: 'materials',
        populate: {
          path: 'author',
          select: 'name'
        }
      });
    
    if (!community) {
      console.log('Community not found');
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user can access this community
    const userId = req.user.id;
    
    // Always allow admin to access
    const isAdmin = community.admin._id.toString() === userId;
    
    // Check if user is a member (teacher or student)
    const isTeacher = community.teachers.some(teacher => 
      teacher._id.toString() === userId
    );
    
    const isStudent = community.students.some(student => 
      student._id.toString() === userId
    );
    
    // If not a member, return 403 with the community basic info
    if (!isAdmin && !isTeacher && !isStudent) {
      console.log('User not a member of community');
      
      // Return limited info - just populate joinRequests for the current user
      const userJoinRequests = community.joinRequests.filter(
        request => request.user && request.user._id && request.user._id.toString() === userId
      );
      
      // Return 403 but include basic community info and user's join request if exists
      return res.status(403).json({ 
        message: 'You do not have permission to view this community.',
        communityBasic: {
          _id: community._id,
          name: community.name, 
          description: community.description,
          admin: { name: community.admin.name }
        },
        joinRequests: userJoinRequests
      });
    }

    console.log('Community found:', community.name);
    res.json(community);
  } catch (error) {
    console.error('Get community error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invalid community ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Join community with code
exports.joinCommunity = async (req, res) => {
  try {
    const { joinCode } = req.body;
    
    // Find community with join code
    const community = await Community.findOne({ joinCode });
    if (!community) {
      return res.status(404).json({ message: 'Invalid join code' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user is already in community
    if (community.admin.toString() === userId ||
        community.teachers.includes(userId) ||
        community.students.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this community' });
    }

    // Add user to appropriate role in community
    if (userRole === 'teacher') {
      community.teachers.push(userId);
    } else if (userRole === 'student') {
      community.students.push(userId);
    }

    await community.save();

    // Add community to user's communities
    await User.findByIdAndUpdate(
      userId,
      { $push: { communities: community._id } }
    );

    res.json({ message: 'Successfully joined community', community });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove member from community (admin only)
exports.removeMember = async (req, res) => {
  try {
    const { communityId, userId, role } = req.body;
    
    // Get community
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if requester is admin
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    // Remove user from appropriate role array
    if (role === 'teacher') {
      community.teachers = community.teachers.filter(id => id.toString() !== userId);
    } else if (role === 'student') {
      community.students = community.students.filter(id => id.toString() !== userId);
    }

    await community.save();

    // Remove community from user's communities
    await User.findByIdAndUpdate(
      userId,
      { $pull: { communities: communityId } }
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete community (admin only)
exports.deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if requester is admin
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can delete community' });
    }

    // Remove community from all members' communities
    const allMemberIds = [
      community.admin,
      ...community.teachers,
      ...community.students
    ];

    await User.updateMany(
      { _id: { $in: allMemberIds } },
      { $pull: { communities: community._id } }
    );

    // Delete community
    await Community.findByIdAndDelete(req.params.id);

    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search communities
exports.searchCommunities = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const communities = await Community.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    })
    .populate('admin', 'name')
    .select('name description admin createdAt');
    
    res.json(communities);
  } catch (error) {
    console.error('Search communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request to join community
exports.requestToJoin = async (req, res) => {
  try {
    const { communityId } = req.body;
    
    // Find community by ID
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user.id;

    // Check if user is already in community
    if (community.admin.toString() === userId ||
        community.teachers.includes(userId) ||
        community.students.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this community' });
    }

    // Check if user already has a pending request
    const existingRequest = community.joinRequests.find(
      request => request.user.toString() === userId && request.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending join request' });
    }

    // Add user to join requests
    community.joinRequests.push({
      user: userId,
      status: 'pending'
    });

    await community.save();

    res.json({ message: 'Join request sent successfully' });
  } catch (error) {
    console.error('Request to join error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle join request (admin only)
exports.handleJoinRequest = async (req, res) => {
  try {
    const { communityId, userId, status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find community
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if requester is admin
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can handle join requests' });
    }

    // Find the join request
    const requestIndex = community.joinRequests.findIndex(
      request => request.user.toString() === userId && request.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    // Update request status
    community.joinRequests[requestIndex].status = status;

    // If approved, add user to community
    if (status === 'approved') {
      // Get user to check role
      const user = await User.findById(userId);
      
      if (user.role === 'teacher') {
        community.teachers.push(userId);
      } else {
        community.students.push(userId);
      }

      // Add community to user's communities
      await User.findByIdAndUpdate(
        userId,
        { $push: { communities: community._id } }
      );
    }

    await community.save();

    res.json({ 
      message: `Join request ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      status
    });
  } catch (error) {
    console.error('Handle join request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get join requests for a community (admin only)
exports.getJoinRequests = async (req, res) => {
  try {
    const { communityId } = req.params;
    
    // Find community
    const community = await Community.findById(communityId)
      .populate('joinRequests.user', 'name email role');
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if requester is admin
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can view join requests' });
    }

    // Return only pending requests
    const pendingRequests = community.joinRequests.filter(request => request.status === 'pending');
    
    res.json(pendingRequests);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave community
exports.leaveCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    // Find community
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.admin.toString() === userId) {
      return res.status(400).json({ message: 'Admin cannot leave the community. Please transfer admin rights or delete the community.' });
    }

    // Remove user from appropriate role array
    let removed = false;
    if (community.teachers.includes(userId)) {
      community.teachers = community.teachers.filter(id => id.toString() !== userId);
      removed = true;
    } else if (community.students.includes(userId)) {
      community.students = community.students.filter(id => id.toString() !== userId);
      removed = true;
    }

    if (!removed) {
      return res.status(400).json({ message: 'You are not a member of this community' });
    }

    await community.save();

    // Remove community from user's communities
    await User.findByIdAndUpdate(
      userId,
      { $pull: { communities: communityId } }
    );

    res.json({ message: 'Successfully left the community' });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 