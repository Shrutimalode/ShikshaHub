const GlobalThread = require('../models/GlobalThread');
const GlobalDiscussion = require('../models/GlobalDiscussion');
const User = require('../models/User');

// Create a new thread (admin only)
exports.createThread = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create threads' });
    }

    const { title, description, moderatorIds } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Verify moderators are teachers
    if (moderatorIds && moderatorIds.length > 0) {
      const moderators = await User.find({
        _id: { $in: moderatorIds },
        role: 'teacher'
      });

      if (moderators.length !== moderatorIds.length) {
        return res.status(400).json({ message: 'All moderators must be teachers' });
      }
    }

    const thread = new GlobalThread({
      title: title.trim(),
      description: description.trim(),
      createdBy: req.user.id,
      moderators: moderatorIds || []
    });

    await thread.save();
    await thread.populate('createdBy', 'name email role');
    await thread.populate('moderators', 'name email role expertise');

    res.status(201).json(thread);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all threads
exports.getThreads = async (req, res) => {
  try {
    const threads = await GlobalThread.find({ isActive: true })
      .populate('createdBy', 'name email role')
      .populate('moderators', 'name email role expertise')
      .sort({ createdAt: -1 });

    res.json(threads);
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single thread with discussions
exports.getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;

    const thread = await GlobalThread.findById(threadId)
      .populate('createdBy', 'name email role')
      .populate('moderators', 'name email role expertise');

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    res.json(thread);
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update thread moderators (admin only)
exports.updateThreadModerators = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update moderators' });
    }

    const { threadId } = req.params;
    const { moderatorIds } = req.body;

    // Verify moderators are teachers
    const moderators = await User.find({
      _id: { $in: moderatorIds },
      role: 'teacher'
    });

    if (moderators.length !== moderatorIds.length) {
      return res.status(400).json({ message: 'All moderators must be teachers' });
    }

    const thread = await GlobalThread.findByIdAndUpdate(
      threadId,
      { moderators: moderatorIds, updatedAt: Date.now() },
      { new: true }
    )
      .populate('createdBy', 'name email role')
      .populate('moderators', 'name email role expertise');

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    res.json(thread);
  } catch (error) {
    console.error('Update moderators error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get teachers for moderator selection
exports.getTeachersForModeration = async (req, res) => {
  try {
    const { search } = req.query;
    
    const query = { role: 'teacher' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { expertise: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const teachers = await User.find(query)
      .select('name email expertise')
      .sort({ name: 1 });

    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Post a question in a thread
exports.postQuestion = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const thread = await GlobalThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Check if user is admin or moderator of this thread
    const isAdmin = req.user.role === 'admin';
    const isModerator = thread.moderators.some(mod => mod.toString() === req.user.id);
    
    const discussion = new GlobalDiscussion({
      thread: threadId,
      author: req.user.id,
      authorRole: req.user.role,
      content: content.trim(),
      isQuestion: true,
      parentDiscussion: null,
      // Auto-approve for admins and moderators
      moderationStatus: (isAdmin || isModerator) ? 'approved' : 'pending'
    });

    await discussion.save();
    await discussion.populate('author', 'name email role expertise');

    res.status(201).json(discussion);
  } catch (error) {
    console.error('Post question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Post a reply to a question/discussion
exports.postReply = async (req, res) => {
  try {
    const { threadId, discussionId } = req.params;
    const { content } = req.body;

    console.log('Post reply request:', {
      threadId,
      discussionId,
      content,
      userId: req.user.id,
      userRole: req.user.role
    });

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const parentDiscussion = await GlobalDiscussion.findById(discussionId).populate('thread');
    if (!parentDiscussion) {
      console.log('Parent discussion not found:', discussionId);
      return res.status(404).json({ message: 'Parent discussion not found' });
    }

    const thread = parentDiscussion.thread;
    
    // Check if user is admin or moderator of this thread
    const isAdmin = req.user.role === 'admin';
    const isModerator = thread.moderators.some(mod => mod.toString() === req.user.id);

    console.log('User permissions:', { isAdmin, isModerator });

    const reply = new GlobalDiscussion({
      thread: threadId,
      author: req.user.id,
      authorRole: req.user.role,
      content: content.trim(),
      isQuestion: false,
      parentDiscussion: discussionId,
      // Auto-approve for admins and moderators
      moderationStatus: (isAdmin || isModerator) ? 'approved' : 'pending'
    });

    await reply.save();
    console.log('Reply saved:', reply._id);
    
    await reply.populate('author', 'name email role expertise');

    // Add reply to parent
    parentDiscussion.replies.push(reply._id);
    await parentDiscussion.save();
    console.log('Reply added to parent discussion');

    res.status(201).json(reply);
  } catch (error) {
    console.error('Post reply error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get discussions for a thread
exports.getThreadDiscussions = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { status } = req.query;

    console.log('Getting discussions for thread:', threadId);

    const thread = await GlobalThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const query = {
      thread: threadId,
      isQuestion: true,
      isDeleted: false
    };

    // Check if user is moderator or admin
    const isModerator = thread.moderators.some(mod => mod.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    console.log('User permissions:', { isModerator, isAdmin, userId: req.user.id });

    if (status && (isModerator || isAdmin)) {
      query.moderationStatus = status;
    } else if (!isAdmin && !isModerator) {
      // Regular users only see approved content
      query.moderationStatus = 'approved';
    }

    // Function to recursively populate replies
    const populateReplies = (depth = 0, maxDepth = 5) => {
      if (depth >= maxDepth) return null;
      
      const moderationFilter = (isAdmin || isModerator) 
        ? { isDeleted: false } 
        : { isDeleted: false, moderationStatus: 'approved' };
      
      return {
        path: 'replies',
        match: moderationFilter,
        populate: [
          {
            path: 'author',
            select: 'name email role expertise'
          },
          populateReplies(depth + 1, maxDepth)
        ].filter(Boolean)
      };
    };

    const discussions = await GlobalDiscussion.find(query)
      .populate('author', 'name email role expertise')
      .populate(populateReplies())
      .sort({ createdAt: -1 });

    console.log(`Found ${discussions.length} discussions`);
    if (discussions.length > 0) {
      console.log('First discussion replies count:', discussions[0].replies?.length || 0);
    }

    res.json(discussions);
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Moderate a discussion (approve/reject)
exports.moderateDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    const discussion = await GlobalDiscussion.findById(discussionId).populate('thread');
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const thread = discussion.thread;
    const isModerator = thread.moderators.some(mod => mod.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isModerator && !isAdmin) {
      return res.status(403).json({ message: 'Only moderators or admins can moderate content' });
    }

    if (action === 'approve') {
      discussion.moderationStatus = 'approved';
    } else if (action === 'reject') {
      discussion.moderationStatus = 'rejected';
      discussion.rejectionReason = reason || 'Content does not meet guidelines';
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
    }

    discussion.moderatedBy = req.user.id;
    discussion.moderatedAt = Date.now();

    await discussion.save();
    await discussion.populate('author', 'name email role expertise');
    await discussion.populate('moderatedBy', 'name email role');

    res.json(discussion);
  } catch (error) {
    console.error('Moderate discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending moderation items
exports.getPendingModeration = async (req, res) => {
  try {
    const { threadId } = req.params;

    const thread = await GlobalThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const isModerator = thread.moderators.some(mod => mod.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isModerator && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pendingItems = await GlobalDiscussion.find({
      thread: threadId,
      moderationStatus: 'pending',
      isDeleted: false
    })
      .populate('author', 'name email role expertise')
      .populate('parentDiscussion', 'content')
      .sort({ createdAt: 1 });

    res.json(pendingItems);
  } catch (error) {
    console.error('Get pending moderation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Like/Unlike a discussion
exports.toggleLike = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await GlobalDiscussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    await discussion.toggleLike(req.user.id);
    await discussion.populate('author', 'name email role expertise');

    res.json(discussion);
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user expertise
exports.updateExpertise = async (req, res) => {
  try {
    const { expertise } = req.body;

    console.log('Update expertise request:', {
      userId: req.user.id,
      expertise: expertise,
      isArray: Array.isArray(expertise)
    });

    if (!Array.isArray(expertise)) {
      return res.status(400).json({ message: 'Expertise must be an array' });
    }

    const cleanedExpertise = expertise.filter(e => e && e.trim()).map(e => e.trim());
    console.log('Cleaned expertise:', cleanedExpertise);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { expertise: cleanedExpertise },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User updated successfully:', {
      userId: user._id,
      name: user.name,
      expertise: user.expertise
    });

    res.json(user);
  } catch (error) {
    console.error('Update expertise error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a discussion or reply (only author can delete)
exports.deleteDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await GlobalDiscussion.findById(discussionId).populate('thread');
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Only the author can delete their own discussion/reply
    const isAuthor = discussion.author.toString() === req.user.id;

    if (!isAuthor) {
      return res.status(403).json({ message: 'You can only delete your own content' });
    }

    // Soft delete: mark as deleted
    discussion.isDeleted = true;
    discussion.deletedAt = Date.now();
    discussion.deletedBy = req.user.id;
    await discussion.save();

    // If this is a reply, remove it from parent's replies array
    if (discussion.parentDiscussion) {
      await GlobalDiscussion.findByIdAndUpdate(
        discussion.parentDiscussion,
        { $pull: { replies: discussionId } }
      );
    }

    res.json({ message: 'Discussion deleted successfully' });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a thread (only admin who created it can delete)
exports.deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;

    const thread = await GlobalThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Only the admin who created the thread can delete it
    const isCreator = thread.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator || !isAdmin) {
      return res.status(403).json({ message: 'Only the admin who created this thread can delete it' });
    }

    // Mark thread as inactive
    thread.isActive = false;
    thread.updatedAt = Date.now();
    await thread.save();

    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get threads where user is a moderator
exports.getModeratorThreads = async (req, res) => {
  try {
    const userId = req.user.id;

    const threads = await GlobalThread.find({
      moderators: userId,
      isActive: true
    })
      .populate('createdBy', 'name email role')
      .populate('moderators', 'name email role expertise')
      .sort({ createdAt: -1 });

    res.json(threads);
  } catch (error) {
    console.error('Get moderator threads error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark a reply as answer
exports.markAsAnswer = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await GlobalDiscussion.findById(discussionId)
      .populate('parentDiscussion')
      .populate('thread');

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!discussion.parentDiscussion) {
      return res.status(400).json({ message: 'Only replies can be marked as answers' });
    }

    const parentDiscussion = await GlobalDiscussion.findById(discussion.parentDiscussion);
    if (!parentDiscussion) {
      return res.status(404).json({ message: 'Parent discussion not found' });
    }

    const userId = req.user.id;
    const thread = discussion.thread;

    // Check permissions: question author, admin, or moderator
    const isQuestionAuthor = parentDiscussion.author.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    const isModerator = thread.moderators.some(mod => mod.toString() === userId);

    if (!isQuestionAuthor && !isAdmin && !isModerator) {
      return res.status(403).json({ 
        message: 'Only the question author, moderators, or admins can mark answers' 
      });
    }

    // Toggle the mark as answer status
    discussion.isMarkedAsAnswer = !discussion.isMarkedAsAnswer;
    discussion.markedAsAnswerBy = discussion.isMarkedAsAnswer ? userId : null;
    await discussion.save();

    // If marked as answer, terminate the parent discussion
    if (discussion.isMarkedAsAnswer) {
      await parentDiscussion.terminateChat('Question marked as answered');
    } else {
      // If unmarked, reopen the discussion
      parentDiscussion.isTerminated = false;
      parentDiscussion.terminatedAt = null;
      parentDiscussion.terminationReason = null;
      await parentDiscussion.save();
    }

    await discussion.populate('author', 'name email role expertise');
    await parentDiscussion.populate('author', 'name email role expertise');

    res.json({ 
      message: discussion.isMarkedAsAnswer 
        ? 'Marked as answer and chat terminated' 
        : 'Unmarked as answer and chat reopened',
      discussion,
      parentDiscussion
    });
  } catch (error) {
    console.error('Mark as answer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

