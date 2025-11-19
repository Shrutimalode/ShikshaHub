import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Badge, Modal, Alert, Dropdown } from 'react-bootstrap';
import { FaReply, FaHeart, FaComment, FaEye, FaThumbtack, FaCheckCircle, FaLink, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './CommunityForum.css';

const WebsiteForum = () => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Filters and sorting
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isQuestion: true,
    tags: '',
    referencedMaterials: []
  });

  const [replyData, setReplyData] = useState({
    content: '',
    referencedMaterials: []
  });

  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState(null);
  const [editData, setEditData] = useState({ title: '', content: '', tags: '' });

  useEffect(() => {
    loadDiscussions();
    loadAllMaterials(); // Load materials from all communities
    loadStats();
  }, [sortBy, filterBy]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/website-discussions', {
        params: { sortBy, filterBy }
      });
      setDiscussions(response.data.discussions);
    } catch (err) {
      setError('Failed to load discussions');
      console.error('Load discussions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMaterials = async () => {
    try {
      // Get all communities first
      const communitiesRes = await api.get('/communities');
      const communities = communitiesRes.data;
      
      // Get materials from all communities
      const allMaterials = [];
      for (const community of communities) {
        try {
          const materialsRes = await api.get(`/materials/community/${community._id}`);
          allMaterials.push(...materialsRes.data);
        } catch (err) {
          console.error(`Error loading materials for community ${community._id}:`, err);
        }
      }
      
      setMaterials(allMaterials);
    } catch (err) {
      console.error('Load all materials error:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/website-discussions/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        ...formData,
        referencedMaterials: selectedMaterials.map(m => ({
          material: m.id,
          note: m.note || ''
        }))
      };

      await api.post('/website-discussions', postData);
      
      setShowNewPost(false);
      setFormData({ title: '', content: '', isQuestion: true, tags: '', referencedMaterials: [] });
      setSelectedMaterials([]);
      loadDiscussions();
      loadStats();
    } catch (err) {
      setError('Failed to create post');
      console.error('Create post error:', err);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      console.log('=== REPLY ATTEMPT ===');
      console.log('Selected Discussion:', selectedDiscussion);
      console.log('Reply Data:', replyData);
      console.log('Selected Materials:', selectedMaterials);
      
      const replyPayload = {
        content: replyData.content,
        parentDiscussionId: selectedDiscussion._id,
        referencedMaterials: selectedMaterials.map(m => ({
          material: m.id,
          note: m.note || ''
        }))
      };

      console.log('Reply Payload:', replyPayload);
      console.log('URL:', '/website-discussions');

      const response = await api.post('/website-discussions', replyPayload);
      console.log('Reply successful:', response.data);
      
      setShowReplyModal(false);
      setReplyData({ content: '', referencedMaterials: [] });
      setSelectedMaterials([]);
      setSelectedDiscussion(null);
      loadDiscussions();
    } catch (err) {
      console.error('=== REPLY ERROR ===');
      console.error('Error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError('Failed to post reply: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLike = async (discussionId) => {
    try {
      await api.post(`/website-discussions/like/${discussionId}`);
      loadDiscussions();
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleMarkAnswer = async (discussionId) => {
    try {
      await api.post(`/website-discussions/mark-answer/${discussionId}`);
      loadDiscussions();
    } catch (err) {
      console.error('Mark answer error:', err);
    }
  };

  const handlePin = async (discussionId) => {
    try {
      await api.post(`/website-discussions/pin/${discussionId}`);
      loadDiscussions();
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  const handleDelete = async (discussionId) => {
    const reason = prompt('Please provide a reason for deletion:');
    if (!reason) return;

    try {
      await api.delete(`/website-discussions/delete/${discussionId}`, {
        data: { reason }
      });
      loadDiscussions();
    } catch (err) {
      setError('Failed to delete discussion');
      console.error('Delete error:', err);
    }
  };

  const handleEdit = (discussion) => {
    setEditingDiscussion(discussion);
    setEditData({
      title: discussion.title || '',
      content: discussion.content || '',
      tags: discussion.tags ? discussion.tags.join(', ') : ''
    });
    setSelectedMaterials(
      discussion.referencedMaterials?.map(ref => ({
        id: ref.material._id || ref.material,
        title: ref.material.title || 'Material',
        note: ref.note || ''
      })) || []
    );
    setShowEditModal(true);
  };

  const handleUpdateDiscussion = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = {
        title: editData.title,
        content: editData.content,
        tags: editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        referencedMaterials: selectedMaterials.map(m => ({
          material: m.id,
          note: m.note || ''
        }))
      };

      await api.put(`/website-discussions/update/${editingDiscussion._id}`, updatePayload);
      
      setShowEditModal(false);
      setEditingDiscussion(null);
      setEditData({ title: '', content: '', tags: '' });
      setSelectedMaterials([]);
      loadDiscussions();
    } catch (err) {
      setError('Failed to update discussion: ' + (err.response?.data?.message || err.message));
      console.error('Update error:', err);
    }
  };

  const addMaterialReference = (material) => {
    if (!selectedMaterials.find(m => m.id === material._id)) {
      setSelectedMaterials([...selectedMaterials, { id: material._id, title: material.title, note: '' }]);
    }
  };

  const removeMaterialReference = (materialId) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'teacher': return 'primary';
      default: return 'secondary';
    }
  };

  const handleViewMaterial = (material) => {
    try {
      // Material object should have fileUrl from backend population
      const fileUrl = material?.fileUrl;
      const materialTitle = material?.title || 'Material';
      
      if (fileUrl) {
        // Open the Cloudinary file URL in a new tab
        window.open(fileUrl, '_blank');
      } else {
        console.error('Material fileUrl not available:', material);
        alert(`Unable to open "${materialTitle}". The file URL is not available.`);
      }
    } catch (error) {
      console.error('Error viewing material:', error);
      alert('Failed to open material. Please try again.');
    }
  };

  const DiscussionCard = ({ discussion, isReply = false }) => {
    const isAuthor = user && (discussion.author._id === user.id || discussion.author._id === user._id);
    const isFaculty = user && (user.role === 'teacher' || user.role === 'admin');
    const canMarkAnswer = discussion.parentDiscussion && (isAuthor || isFaculty);
    
    // Debug logging
    console.log('Edit button check:', {
      userId: user?.id,
      userIdAlt: user?._id,
      authorId: discussion.author._id,
      isAuthor: isAuthor,
      userName: user?.name,
      authorName: discussion.author?.name
    });

    return (
      <Card className={`mb-3 ${isReply ? 'ms-4' : ''} ${discussion.isPinned ? 'border-warning' : ''}`}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              {/* Author Info */}
              <div className="d-flex align-items-center mb-2">
                <strong>{discussion.author.name}</strong>
                <Badge bg={getRoleBadgeColor(discussion.author.role)} className="ms-2">
                  {discussion.author.role}
                </Badge>
                {discussion.isPinned && <FaThumbtack className="ms-2 text-warning" title="Pinned" />}
                {discussion.isMarkedAsAnswer && <FaCheckCircle className="ms-2 text-success" title="Marked as Answer" />}
                <small className="text-muted ms-2">
                  {new Date(discussion.createdAt).toLocaleString()}
                </small>
              </div>

              {/* Title (for top-level posts) */}
              {!isReply && discussion.title && (
                <h5 className="mb-2">
                  {discussion.isQuestion && <Badge bg="info" className="me-2">Question</Badge>}
                  {discussion.title}
                </h5>
              )}

              {/* Content */}
              <p className="mb-2">{discussion.content}</p>

              {/* Tags */}
              {discussion.tags && discussion.tags.length > 0 && (
                <div className="mb-2">
                  {discussion.tags.map((tag, idx) => (
                    <Badge key={idx} bg="light" text="dark" className="me-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Referenced Materials */}
              {discussion.referencedMaterials && discussion.referencedMaterials.length > 0 && (
                <div className="mb-2 p-2 bg-light rounded">
                  <small className="text-muted d-block mb-1">
                    <FaLink className="me-1" /> Referenced Materials:
                  </small>
                  {discussion.referencedMaterials.map((ref, idx) => (
                    <div key={idx} className="ms-2 mb-1">
                      <a 
                        href="#" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          handleViewMaterial(ref.material);
                        }}
                        className="text-primary fw-semibold"
                        style={{ 
                          cursor: 'pointer', 
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                        title="Click to view material"
                      >
                        📎 {ref.material.title || 'Material'}
                      </a>
                      {ref.note && (
                        <small className="text-muted d-block ms-3 fst-italic">
                          Note: {ref.note}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex align-items-center gap-2 mt-3">
                {/* Like Button */}
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => handleLike(discussion._id)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '5px 12px' }}
                >
                  <FaHeart className={discussion.likes?.includes(user?.id) || discussion.likes?.includes(user?._id) ? 'text-danger' : ''} style={{ fontSize: '14px' }} />
                  <span style={{ fontSize: '13px' }}>{discussion.likeCount || 0}</span>
                </Button>

                {/* Reply Button - Only for top-level posts */}
                {!isReply && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => {
                      setSelectedDiscussion(discussion);
                      setShowReplyModal(true);
                    }}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaReply style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>Reply</span>
                    {discussion.replyCount > 0 && <span style={{ fontSize: '13px' }}> ({discussion.replyCount})</span>}
                  </Button>
                )}

                {/* Edit Button - For own posts */}
                {isAuthor && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => handleEdit(discussion)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaEdit style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>Edit</span>
                  </Button>
                )}

                {/* Faculty Actions - Pin/Unpin */}
                {isFaculty && (
                  <Button 
                    variant="outline-warning" 
                    size="sm" 
                    onClick={() => handlePin(discussion._id)} 
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaThumbtack style={{ fontSize: '14px' }} /> 
                    <span style={{ fontSize: '13px' }}>{discussion.isPinned ? 'Unpin' : 'Pin'}</span>
                  </Button>
                )}

                {/* Mark as Answer */}
                {canMarkAnswer && isReply && (
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={() => handleMarkAnswer(discussion._id)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaCheckCircle style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>{discussion.isMarkedAsAnswer ? 'Unmark' : 'Mark as Answer'}</span>
                  </Button>
                )}

                {/* Delete */}
                {(isAuthor || isFaculty) && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => handleDelete(discussion._id)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaTrash style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>Delete</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card.Body>

        {/* Replies */}
        {!isReply && discussion.replies && discussion.replies.length > 0 && (
          <div className="ms-3 me-3 mb-3">
            {discussion.replies.map(reply => (
              <DiscussionCard key={reply._id} discussion={reply} isReply={true} />
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="website-forum">
      {/* Stats Bar */}
      {stats && (
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-around text-center">
              <div>
                <h4>{stats.totalDiscussions}</h4>
                <small className="text-muted">Discussions</small>
              </div>
              <div>
                <h4>{stats.totalQuestions}</h4>
                <small className="text-muted">Questions</small>
              </div>
              <div>
                <h4>{stats.unansweredQuestions}</h4>
                <small className="text-muted">Unanswered</small>
              </div>
              <div>
                <h4>{stats.totalReplies}</h4>
                <small className="text-muted">Replies</small>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button variant="primary" onClick={() => setShowNewPost(true)}>
            <FaComment /> New Post
          </Button>
        </div>
        
        <div className="d-flex gap-2">
          <Form.Select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Posts</option>
            <option value="questions">Questions Only</option>
            <option value="posts">General Posts</option>
          </Form.Select>

          <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto' }}>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="faculty">Faculty First</option>
            <option value="unanswered">Unanswered</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Discussions List */}
      {loading ? (
        <div className="text-center">Loading discussions...</div>
      ) : discussions.length === 0 ? (
        <Alert variant="info">No discussions yet. Be the first to start one!</Alert>
      ) : (
        discussions.map(discussion => (
          <DiscussionCard key={discussion._id} discussion={discussion} />
        ))
      )}

      {/* New Post Modal */}
      <Modal show={showNewPost} onHide={() => setShowNewPost(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreatePost}>
            <Form.Group className="mb-3">
              <Form.Check 
                type="radio"
                label="Question"
                name="postType"
                checked={formData.isQuestion}
                onChange={() => setFormData({ ...formData, isQuestion: true })}
                inline
              />
              <Form.Check 
                type="radio"
                label="General Post"
                name="postType"
                checked={!formData.isQuestion}
                onChange={() => setFormData({ ...formData, isQuestion: false })}
                inline
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={200}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control 
                as="textarea"
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                maxLength={5000}
              />
              <Form.Text className="text-muted">
                {formData.content.length}/5000 characters
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tags (comma separated)</Form.Label>
              <Form.Control 
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., homework, chapter-1, doubt"
              />
            </Form.Group>

            {/* Material References */}
            <Form.Group className="mb-3">
              <Form.Label>Reference Materials (Optional)</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  Add Material Reference
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {materials.map(material => (
                    <Dropdown.Item 
                      key={material._id} 
                      onClick={() => addMaterialReference(material)}
                    >
                      {material.title}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {selectedMaterials.length > 0 && (
                <div className="mt-2">
                  {selectedMaterials.map((mat, idx) => (
                    <div key={idx} className="d-flex align-items-center mb-2">
                      <Badge bg="secondary" className="me-2">{mat.title}</Badge>
                      <Form.Control 
                        type="text"
                        size="sm"
                        placeholder="Add a note (optional)"
                        value={mat.note}
                        onChange={(e) => {
                          const updated = [...selectedMaterials];
                          updated[idx].note = e.target.value;
                          setSelectedMaterials(updated);
                        }}
                        className="me-2"
                        style={{ width: '300px' }}
                      />
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => removeMaterialReference(mat.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Post
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Reply Modal */}
      <Modal show={showReplyModal} onHide={() => setShowReplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reply to {selectedDiscussion?.author?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDiscussion && (
            <>
              <Card className="mb-3 bg-light">
                <Card.Body>
                  <strong>{selectedDiscussion.title || 'Original Post'}</strong>
                  <p className="mt-2">{selectedDiscussion.content}</p>
                </Card.Body>
              </Card>

              <Form onSubmit={handleReply}>
                <Form.Group className="mb-3">
                  <Form.Label>Your Reply</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={4}
                    value={replyData.content}
                    onChange={(e) => setReplyData({ ...replyData, content: e.target.value })}
                    required
                    maxLength={5000}
                  />
                </Form.Group>

                {/* Material References for Reply */}
                <Form.Group className="mb-3">
                  <Form.Label>Reference Materials (Optional)</Form.Label>
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      Add Material Reference
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {materials.map(material => (
                        <Dropdown.Item 
                          key={material._id} 
                          onClick={() => addMaterialReference(material)}
                        >
                          {material.title}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>

                  {selectedMaterials.length > 0 && (
                    <div className="mt-2">
                      {selectedMaterials.map((mat, idx) => (
                        <div key={idx} className="d-flex align-items-center mb-2">
                          <Badge bg="secondary" className="me-2">{mat.title}</Badge>
                          <Form.Control 
                            type="text"
                            size="sm"
                            placeholder="Add a note (optional)"
                            value={mat.note}
                            onChange={(e) => {
                              const updated = [...selectedMaterials];
                              updated[idx].note = e.target.value;
                              setSelectedMaterials(updated);
                            }}
                            className="me-2"
                            style={{ width: '300px' }}
                          />
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => removeMaterialReference(mat.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowReplyModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Post Reply
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit {editingDiscussion?.parentDiscussion ? 'Reply' : 'Discussion'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingDiscussion && (
            <Form onSubmit={handleUpdateDiscussion}>
              {/* Title - Only for top-level posts */}
              {!editingDiscussion.parentDiscussion && (
                <Form.Group className="mb-3">
                  <Form.Label>Title</Form.Label>
                  <Form.Control 
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    required
                    maxLength={200}
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Content</Form.Label>
                <Form.Control 
                  as="textarea"
                  rows={5}
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  required
                  maxLength={5000}
                />
                <Form.Text className="text-muted">
                  {editData.content.length}/5000 characters
                </Form.Text>
              </Form.Group>

              {/* Tags - Only for top-level posts */}
              {!editingDiscussion.parentDiscussion && (
                <Form.Group className="mb-3">
                  <Form.Label>Tags (comma separated)</Form.Label>
                  <Form.Control 
                    type="text"
                    value={editData.tags}
                    onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                    placeholder="e.g., homework, chapter-1, doubt"
                  />
                </Form.Group>
              )}

              {/* Material References */}
              <Form.Group className="mb-3">
                <Form.Label>Reference Materials (Optional)</Form.Label>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Add Material Reference
                  </Dropdown.Toggle>
                  <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {materials.map(material => (
                      <Dropdown.Item 
                        key={material._id} 
                        onClick={() => addMaterialReference(material)}
                      >
                        {material.title}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>

                {selectedMaterials.length > 0 && (
                  <div className="mt-2">
                    {selectedMaterials.map((mat, idx) => (
                      <div key={idx} className="d-flex align-items-center mb-2">
                        <Badge bg="secondary" className="me-2">{mat.title}</Badge>
                        <Form.Control 
                          type="text"
                          size="sm"
                          placeholder="Add a note (optional)"
                          value={mat.note}
                          onChange={(e) => {
                            const updated = [...selectedMaterials];
                            updated[idx].note = e.target.value;
                            setSelectedMaterials(updated);
                          }}
                          className="me-2"
                          style={{ width: '300px' }}
                        />
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => removeMaterialReference(mat.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Update
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default WebsiteForum;