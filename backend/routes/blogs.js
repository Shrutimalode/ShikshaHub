const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const auth = require('../middleware/auth');

// @route   POST api/blogs
// @desc    Create a new blog post
// @access  Private
router.post('/', auth, blogController.createBlog);

// @route   GET api/blogs/community/:communityId
// @desc    Get all blogs in a community (filtered by permissions)
// @access  Private
router.get('/community/:communityId', auth, blogController.getBlogsByCommunity);

// @route   GET api/blogs/:blogId
// @desc    Get a blog post by ID
// @access  Private
router.get('/:blogId', auth, blogController.getBlogById);

// @route   PUT api/blogs/:blogId
// @desc    Update a blog post
// @access  Private (Author only)
router.put('/:blogId', auth, blogController.updateBlog);

// @route   DELETE api/blogs/:blogId
// @desc    Delete a blog post
// @access  Private (Author only)
router.delete('/:blogId', auth, blogController.deleteBlog);

// @route   PUT api/blogs/review/:blogId
// @desc    Review a blog post (approve/reject)
// @access  Private (Admin or Teacher only)
router.put('/review/:blogId', auth, blogController.reviewBlog);

// @route   PUT api/blogs/resubmit/:blogId
// @desc    Resubmit a rejected blog post
// @access  Private (Author only)
router.put('/resubmit/:blogId', auth, blogController.resubmitBlog);

// @route   GET api/blogs/pending/:communityId
// @desc    Get pending blog posts for review
// @access  Private (Admin or Teacher only)
router.get('/pending/:communityId', auth, blogController.getPendingBlogs);

// @route   GET api/blogs/search/:communityId
// @desc    Search blogs in a community
// @access  Private
router.get('/search/:communityId', auth, blogController.searchBlogs);

// @route   POST api/blogs/summarize
// @desc    Generate summary of a blog post
// @access  Private
router.post('/summarize', auth, blogController.summarizeBlog);

module.exports = router; 