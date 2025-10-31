const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST api/materials
// @desc    Upload a new material
// @access  Private
router.post('/', auth, upload.single('file'), materialController.uploadMaterial);

// @route   GET api/materials/community/:communityId
// @desc    Get all materials in a community
// @access  Private
router.get('/community/:communityId', auth, materialController.getMaterialsByCommunity);

// @route   GET api/materials/search/:communityId
// @desc    Search materials within a community
// @access  Private
router.get('/search/:communityId', auth, materialController.searchMaterials);

// @route   DELETE api/materials/:materialId
// @desc    Delete a material (admin or author only)
// @access  Private
router.delete('/:materialId', auth, materialController.deleteMaterial);

// @route   GET api/materials/download/:materialId
// @desc    Download a material file
// @access  Private
router.get('/download/:materialId', auth, materialController.downloadMaterial);

module.exports = router; 