const Material = require('../models/Material');
const Community = require('../models/Community');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // Import child_process
const axios = require('axios');
const { sendMaterialUploadEmail } = require('../utils/emailService');

// Upload new material
exports.uploadMaterial = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description, communityId, tags } = req.body;
    // Use Cloudinary URL and metadata
    const fileUrl = req.file.path; // Cloudinary URL
    const originalFileName = req.file.originalname;
    const fileExtension = require('path').extname(originalFileName).toLowerCase();
    const mimeType = req.file.mimetype;
    console.log(`Debug: Uploaded file path (req.file.path) = ${req.file.path}`);
    console.log(`Debug: Storing fileUrl in DB = ${fileUrl}`);
    
    // Determine file type and MIME type
    let fileType = 'document'; // Default to a generic document type
    // let mimeType = 'application/octet-stream'; // Default to a generic binary stream

    if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(fileExtension)) {
      fileType = 'image';
      // mimeType = `image/${fileExtension.substring(1)}`;
    } else if (['.mp4', '.webm', '.avi', '.mov'].includes(fileExtension)) {
      fileType = 'video';
      // mimeType = `video/${fileExtension.substring(1)}`;
    } else if (['.mp3', '.wav', '.ogg'].includes(fileExtension)) {
      fileType = 'audio';
      // mimeType = `audio/${fileExtension.substring(1)}`;
    } else if (['.pdf'].includes(fileExtension)) {
      fileType = 'pdf';
      // mimeType = 'application/pdf';
    } else if (['.txt', '.log', '.md'].includes(fileExtension)) {
      fileType = 'text';
      // mimeType = 'text/plain';
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      fileType = 'word';
      // mimeType = 'application/msword'; // For .doc
      if (fileExtension === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (['.xls', '.xlsx'].includes(fileExtension)) {
      fileType = 'excel';
      // mimeType = 'application/vnd.ms-excel'; // For .xls
      if (fileExtension === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (['.ppt', '.pptx'].includes(fileExtension)) {
      fileType = 'powerpoint';
      // mimeType = 'application/vnd.ms-powerpoint'; // For .ppt
      if (fileExtension === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }

    // Check if community exists and user is a member
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verify user belongs to community
    const isMember = 
      community.admin.toString() === userId ||
      community.teachers.some(teacherId => teacherId.toString() === userId) ||
      community.students.some(studentId => studentId.toString() === userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

    // Create new material
    const newMaterial = new Material({
      title,
      description,
      fileUrl,
      originalFileName,
      fileType,
      mimeType,
      community: communityId,
      author: userId,
      authorRole: userRole,
      tags: tagArray
    });

    await newMaterial.save();

    // Add material to community
    await Community.findByIdAndUpdate(
      communityId,
      { $push: { materials: newMaterial._id } }
    );

    // Notify community members (admin, teachers, students)
    const memberIds = [
      community.admin,
      ...community.teachers,
      ...community.students
    ];
    const User = require('../models/User');
    const members = await User.find({ _id: { $in: memberIds } });
    for (const member of members) {
      if (member.emailPreferences?.materialUpload !== false) {
        sendMaterialUploadEmail(member.email, community.name, newMaterial.title);
      }
    }

    res.status(201).json(newMaterial);
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get materials by community
exports.getMaterialsByCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    
    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Verify user belongs to community
    const userId = req.user.id;
    const isMember = 
      community.admin.toString() === userId ||
      community.teachers.some(teacherId => teacherId.toString() === userId) ||
      community.students.some(studentId => studentId.toString() === userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Get materials
    const materials = await Material.find({ community: communityId })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    
    res.json(materials);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete material (admin or author)
exports.deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    // Find material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if user is admin or author
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin';
    const isAuthor = material.author.toString() === userId;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ message: 'You are not authorized to delete this material' });
    }

    // Delete file from Cloudinary
    const cloudinary = require('cloudinary').v2;
    if (material.fileUrl && material.fileUrl.includes('cloudinary.com')) {
      // Extract public_id from the URL
      const urlParts = material.fileUrl.split('/');
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const publicId = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.'));
      try {
        await cloudinary.uploader.destroy(`shikshahub_uploads/${publicId}`, { resource_type: 'auto' });
      } catch (err) {
        console.error('Error deleting file from Cloudinary:', err);
      }
    }

    // Remove material from community
    await Community.findByIdAndUpdate(
      material.community,
      { $pull: { materials: materialId } }
    );

    // Delete material
    await Material.findByIdAndDelete(materialId);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search materials within a community
exports.searchMaterials = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Verify user belongs to community
    const userId = req.user.id;
    const isMember = 
      community.admin.toString() === userId ||
      community.teachers.some(teacherId => teacherId.toString() === userId) ||
      community.students.some(studentId => studentId.toString() === userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Search materials
    const materials = await Material.find({
      community: communityId,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ]
    })
    .populate('author', 'name')
    .sort({ createdAt: -1 });
    
    res.json(materials);
  } catch (error) {
    console.error('Search materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download a material file
exports.downloadMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const view = req.query.view; // <-- Correct scope
    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const community = await Community.findById(material.community);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    const userId = req.user.id;
    const isMember =
      community.admin.toString() === userId ||
      community.teachers.some(t => t.toString() === userId) ||
      community.students.some(s => s.toString() === userId);
    if (!isMember) return res.status(403).json({ message: 'Unauthorized' });

    if (material.fileUrl && material.fileUrl.includes('cloudinary.com')) {
      const dispositionToServe = view === 'true' ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${dispositionToServe}; filename="${material.originalFileName}"`);
      try {
        const fileResponse = await axios.get(material.fileUrl, { responseType: 'stream' });
        res.setHeader('Content-Type', fileResponse.headers['content-type'] || material.mimeType || 'application/octet-stream');
        fileResponse.data.pipe(res);
        return;
      } catch (err) {
        console.error('Error proxying file from Cloudinary:', err);
        return res.status(500).json({ message: 'Error retrieving file from Cloudinary' });
      }
    }

  } catch (err) {
    console.error('Download material error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
