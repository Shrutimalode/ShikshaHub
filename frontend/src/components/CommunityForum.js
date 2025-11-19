import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Badge, Modal, Alert, Dropdown, Tabs, Tab } from 'react-bootstrap';
import { FaReply, FaHeart, FaComment, FaEye, FaThumbtack, FaCheckCircle, FaLink, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './CommunityForum.css';

const CommunityForum = ({ communityId }) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [openChats, setOpenChats] = useState([]); // Array to track open chat tabs
  const [activeChatTab, setActiveChatTab] = useState('all'); // Track active tab
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // Track which message we're replying to
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
    loadMaterials();
    loadStats();
  }, [communityId, sortBy, filterBy]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/community-discussions/${communityId}`, {
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

  const loadMaterials = async () => {
    try {
      const response = await api.get(`/materials/community/${communityId}`);
      setMaterials(response.data);
    } catch (err) {
      console.error('Load materials error:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/community-discussions/stats/${communityId}`);
      setStats(response.data);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  // Load a specific chat with all replies
  const loadChat = async (discussionId) => {
    try {
      const response = await api.get(`/community-discussions/${communityId}/${discussionId}`);
      return response.data;
    } catch (err) {
      console.error('Load chat error:', err);
      throw err;
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        ...formData,
        referencedMaterials: selectedMaterials.map(m => ({
          material: m.id,
          note: m.note || ''
        }))
      };

      const response = await api.post(`/community-discussions/${communityId}`, postData);
      
      // Add the new discussion to the list
      setDiscussions([response.data, ...discussions]);
      
      setShowNewChat(false);
      setFormData({ title: '', content: '', isQuestion: true, tags: '', referencedMaterials: [] });
      setSelectedMaterials([]);
      loadStats();
    } catch (err) {
      setError('Failed to create chat');
      console.error('Create chat error:', err);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      const replyPayload = {
        content: replyData.content,
        parentDiscussionId: selectedDiscussion._id,
        referencedMaterials: selectedMaterials.map(m => ({
          material: m.id,
          note: m.note || ''
        }))
      };

      await api.post(`/community-discussions/${communityId}`, replyPayload);
      
      setShowReplyModal(false);
      setReplyData({ content: '', referencedMaterials: [] });
      setSelectedMaterials([]);
      setSelectedDiscussion(null);
      setReplyingTo(null);
      
      // Reload the chat if it's open
      if (openChats.find(chat => chat._id === selectedDiscussion._id)) {
        const updatedChat = await loadChat(selectedDiscussion._id);
        setOpenChats(openChats.map(chat => 
          chat._id === selectedDiscussion._id ? updatedChat : chat
        ));
      }
      
      loadDiscussions();
    } catch (err) {
      setError('Failed to post reply: ' + (err.response?.data?.message || err.message));
      console.error('Reply error:', err);
    }
  };

  const handleLike = async (discussionId) => {
    try {
      await api.post(`/community-discussions/like/${discussionId}`);
      
      // Update the discussion in the list
      setDiscussions(discussions.map(discussion => {
        if (discussion._id === discussionId) {
          const isLiked = discussion.likes?.includes(user.id) || discussion.likes?.includes(user._id);
          return {
            ...discussion,
            likes: isLiked 
              ? discussion.likes.filter(id => id !== user.id && id !== user._id)
              : [...(discussion.likes || []), user.id || user._id],
            likeCount: isLiked ? (discussion.likeCount || 0) - 1 : (discussion.likeCount || 0) + 1
          };
        }
        return discussion;
      }));
      
      // Update open chats if needed
      setOpenChats(openChats.map(chat => {
        if (chat._id === discussionId) {
          const isLiked = chat.likes?.includes(user.id) || chat.likes?.includes(user._id);
          return {
            ...chat,
            likes: isLiked 
              ? chat.likes.filter(id => id !== user.id && id !== user._id)
              : [...(chat.likes || []), user.id || user._id],
            likeCount: isLiked ? (chat.likeCount || 0) - 1 : (chat.likeCount || 0) + 1
          };
        }
        return chat;
      }));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleMarkAnswer = async (discussionId) => {
    // Show confirmation dialog
    const userConfirmed = window.confirm(
      'Are you satisfied with this answer?\n\nClicking OK will mark this as the answer and terminate the chat.'
    );
    
    if (!userConfirmed) {
      return; // User cancelled
    }
    
    try {
      await api.post(`/community-discussions/mark-answer/${discussionId}`);
      
      // Show success message
      alert('Answer marked successfully! The chat has been terminated.');
      
      // Reload discussions and open chats
      loadDiscussions();
      
      // Update open chats
      const updatedOpenChats = await Promise.all(openChats.map(async (chat) => {
        if (chat._id === discussionId || chat.replies?.find(reply => reply._id === discussionId)) {
          return await loadChat(chat._id);
        }
        return chat;
      }));
      setOpenChats(updatedOpenChats);
    } catch (err) {
      console.error('Mark answer error:', err);
      alert('Failed to mark answer. Please try again.');
    }
  };

  const handlePin = async (discussionId) => {
    try {
      await api.post(`/community-discussions/pin/${discussionId}`);
      loadDiscussions();
      
      // Update open chats
      const updatedOpenChats = await Promise.all(openChats.map(async (chat) => {
        if (chat._id === discussionId) {
          return await loadChat(chat._id);
        }
        return chat;
      }));
      setOpenChats(updatedOpenChats);
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  const handleDelete = async (discussionId) => {
    const reason = prompt('Please provide a reason for deletion:');
    if (!reason) return;

    try {
      await api.delete(`/community-discussions/delete/${discussionId}`, {
        data: { reason }
      });
      loadDiscussions();
      
      // Close the chat tab if it was open
      setOpenChats(openChats.filter(chat => chat._id !== discussionId));
      
      // If it was a reply, reload the parent chat
      const updatedOpenChats = await Promise.all(openChats.map(async (chat) => {
        if (chat.replies?.find(reply => reply._id === discussionId)) {
          return await loadChat(chat._id);
        }
        return chat;
      }));
      setOpenChats(updatedOpenChats);
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

      const response = await api.put(`/community-discussions/update/${editingDiscussion._id}`, updatePayload);
      
      // Update in discussions list
      setDiscussions(discussions.map(discussion => 
        discussion._id === editingDiscussion._id ? response.data : discussion
      ));
      
      // Update in open chats
      setOpenChats(openChats.map(chat => 
        chat._id === editingDiscussion._id ? response.data : chat
      ));
      
      setShowEditModal(false);
      setEditingDiscussion(null);
      setEditData({ title: '', content: '', tags: '' });
      setSelectedMaterials([]);
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
      const fileUrl = material?.fileUrl;
      const materialTitle = material?.title || 'Material';
      
      if (fileUrl) {
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

  // Open a chat in a new tab
  const openChatTab = async (discussion) => {
    try {
      // Check if chat is already open
      if (!openChats.find(chat => chat._id === discussion._id)) {
        // Load the full chat with replies
        const fullChat = await loadChat(discussion._id);
        setOpenChats([...openChats, fullChat]);
      }
      
      // Set the active tab to this chat
      setActiveChatTab(discussion._id);
    } catch (err) {
      setError('Failed to open chat: ' + (err.response?.data?.message || err.message));
      console.error('Open chat error:', err);
    }
  };

  // Close a chat tab
  const closeChatTab = (discussionId) => {
    const updatedOpenChats = openChats.filter(chat => chat._id !== discussionId);
    setOpenChats(updatedOpenChats);
    
    // If we're closing the active tab, switch to 'all'
    if (activeChatTab === discussionId) {
      setActiveChatTab('all');
    }
  };

  // Start replying to a specific message
  const startReply = (discussion) => {
    setReplyingTo(discussion);
    setSelectedDiscussion(discussion.parentDiscussion ? { _id: discussion.parentDiscussion } : discussion);
    setShowReplyModal(true);
  };

  // Component for displaying a discussion in the "All Discussions" tab (title only)
  const DiscussionTitleCard = ({ discussion }) => {
    const isAuthor = user && (discussion.author._id === user.id || discussion.author._id === user._id);
    const isFaculty = user && (user.role === 'teacher' || user.role === 'admin');
    
    return (
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              {/* Title */}
              <h5 className="mb-2">
                {discussion.isQuestion && <Badge bg="info" className="me-2">Question</Badge>}
                {discussion.title}
              </h5>
              
              {/* Author Info */}
              <div className="d-flex align-items-center mb-2">
                <small className="text-muted">
                  Started by <strong>{discussion.author.name}</strong>
                </small>
                <Badge bg={getRoleBadgeColor(discussion.author.role)} className="ms-2">
                  {discussion.author.role}
                </Badge>
                {discussion.isPinned && <FaThumbtack className="ms-2 text-warning" title="Pinned" />}
                {discussion.isTerminated && <Badge bg="secondary" className="ms-2">Terminated</Badge>}
                <small className="text-muted ms-2">
                  {new Date(discussion.createdAt).toLocaleDateString()}
                </small>
              </div>

              {/* Stats */}
              <div className="d-flex gap-3">
                <small className="text-muted">
                  <FaComment className="me-1" /> {discussion.replyCount || 0} replies
                </small>
                <small className="text-muted">
                  <FaEye className="me-1" /> {discussion.viewCount || 0} views
                </small>
                <small className="text-muted">
                  <FaHeart className="me-1" /> {discussion.likeCount || 0} likes
                </small>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="d-flex align-items-center gap-2">
              {/* Like Button */}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleLike(discussion._id)}
                className="d-flex align-items-center gap-1"
                style={{ borderRadius: '20px', padding: '5px 12px' }}
              >
                <FaHeart className={discussion.likes?.includes(user?.id) || discussion.likes?.includes(user?._id) ? 'text-danger' : ''} style={{ fontSize: '14px' }} />
              </Button>
              
              {/* Open Chat Button */}
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => openChatTab(discussion)}
              >
                Open Chat
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Recursive component for displaying nested replies
  const ReplyTree = ({ reply, parentDiscussion, depth = 0, chatId }) => {
    const isAuthor = user && (reply.author._id === user.id || reply.author._id === user._id);
    const isFaculty = user && (user.role === 'teacher' || user.role === 'admin');
    // Only the discussion creator can mark answers
    const isDiscussionCreator = user && (parentDiscussion.author._id === user.id || parentDiscussion.author._id === user._id);
    const canMarkAnswer = parentDiscussion.isQuestion && isDiscussionCreator && !parentDiscussion.isTerminated;
    const isTerminated = parentDiscussion.isTerminated || false;
    
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [replyMaterials, setReplyMaterials] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Limit nesting depth for visual clarity
    const maxDepth = 5;
    const currentDepth = Math.min(depth, maxDepth);
    const marginLeft = currentDepth * 30; // 30px per level of nesting
    
    const handleReplySubmit = async (e) => {
      e.preventDefault();
      if (!replyContent.trim()) return;
      
      try {
        setIsSubmitting(true);
        const replyPayload = {
          content: replyContent.trim(),
          parentDiscussionId: reply._id,
          referencedMaterials: replyMaterials.map(m => ({
            material: m.id,
            note: m.note || ''
          }))
        };

        await api.post(`/community-discussions/${communityId}`, replyPayload);
        
        // Clear form
        setReplyContent('');
        setReplyMaterials([]);
        setShowReplyForm(false);
        
        // Reload the chat
        const updatedChat = await loadChat(chatId);
        setOpenChats(openChats.map(c => c._id === chatId ? updatedChat : c));
      } catch (err) {
        setError('Failed to post reply: ' + (err.response?.data?.message || err.message));
        console.error('Reply error:', err);
      } finally {
        setIsSubmitting(false);
      }
    };
    
    const addReplyMaterial = (material) => {
      if (!replyMaterials.find(m => m.id === material._id)) {
        setReplyMaterials([...replyMaterials, { id: material._id, title: material.title, note: '' }]);
      }
    };
    
    const removeReplyMaterial = (materialId) => {
      setReplyMaterials(replyMaterials.filter(m => m.id !== materialId));
    };
    
    return (
      <div style={{ marginLeft: `${marginLeft}px`, marginTop: '10px' }}>
        <Card className="mb-2" style={{ backgroundColor: depth === 0 ? '#f8f9fa' : '#ffffff', border: '1px solid #dee2e6' }}>
          <Card.Body style={{ padding: '12px' }}>
            {/* Author Info */}
            <div className="d-flex align-items-center mb-2">
              <strong>{reply.author.name}</strong>
              <Badge bg={getRoleBadgeColor(reply.author.role)} className="ms-2" style={{ fontSize: '0.7rem' }}>
                {reply.author.role}
              </Badge>
              {reply.isMarkedAsAnswer && <FaCheckCircle className="ms-2 text-success" title="Marked as Answer" />}
              <small className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                {new Date(reply.createdAt).toLocaleString()}
              </small>
              {reply.isEdited && <small className="text-muted ms-2">(Edited)</small>}
            </div>

            {/* Content */}
            <p className="mb-2" style={{ fontSize: '0.95rem' }}>{reply.content}</p>

            {/* Referenced Materials */}
            {reply.referencedMaterials && reply.referencedMaterials.length > 0 && (
              <div className="mb-2 p-2 bg-light rounded">
                <small className="text-muted d-block mb-1">
                  <FaLink className="me-1" /> Referenced Materials:
                </small>
                {reply.referencedMaterials.map((ref, idx) => (
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
                        display: 'inline-block',
                        fontSize: '0.85rem'
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
            <div className="d-flex align-items-center gap-1">
              {/* Like Button */}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleLike(reply._id)}
                className="d-flex align-items-center gap-1"
                style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <FaHeart className={reply.likes?.includes(user?.id) || reply.likes?.includes(user?._id) ? 'text-danger' : ''} style={{ fontSize: '12px' }} />
                {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
              </Button>
              
              {/* Reply Button */}
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="d-flex align-items-center gap-1"
                style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                disabled={isTerminated}
                title={isTerminated ? 'Chat is terminated - replies are disabled' : 'Reply to this message'}
              >
                <FaReply style={{ fontSize: '12px' }} />
                <span>Reply {reply.replies && reply.replies.length > 0 ? `(${reply.replies.length})` : ''}</span>
              </Button>
              
              {/* Mark as Answer */}
              {canMarkAnswer && !reply.isMarkedAsAnswer && (
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  onClick={() => handleMarkAnswer(reply._id)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                  title="Mark this as the answer and terminate the chat"
                >
                  <FaCheckCircle style={{ fontSize: '12px' }} />
                  <span style={{ fontSize: '0.75rem' }}>Mark Answer</span>
                </Button>
              )}
              
              {/* Edit Button */}
              {isAuthor && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => handleEdit(reply)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  <FaEdit style={{ fontSize: '12px' }} />
                </Button>
              )}
              
              {/* Delete Button */}
              {(isAuthor || isFaculty) && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => handleDelete(reply._id)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  <FaTrash style={{ fontSize: '12px' }} />
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
        
        {/* Reply Form */}
        {showReplyForm && !isTerminated && (
          <div className="mt-2 mb-3 p-3 border rounded" style={{ marginLeft: '30px', backgroundColor: '#f8f9fa' }}>
            <div className="mb-2">
              <small className="text-muted">Replying to {reply.author.name}</small>
            </div>
            <Form onSubmit={handleReplySubmit}>
              <Form.Group className="mb-2">
                <Form.Control 
                  as="textarea"
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  required
                />
              </Form.Group>
              
              {/* Material References */}
              <Form.Group className="mb-2">
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Add Material Reference
                  </Dropdown.Toggle>
                  <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {materials.map(material => (
                      <Dropdown.Item 
                        key={material._id} 
                        onClick={() => addReplyMaterial(material)}
                      >
                        {material.title}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>

                {replyMaterials.length > 0 && (
                  <div className="mt-2">
                    {replyMaterials.map((mat, idx) => (
                      <div key={idx} className="d-flex align-items-center mb-2">
                        <Badge bg="secondary" className="me-2">{mat.title}</Badge>
                        <Form.Control 
                          type="text"
                          size="sm"
                          placeholder="Add a note (optional)"
                          value={mat.note}
                          onChange={(e) => {
                            const updated = [...replyMaterials];
                            updated[idx].note = e.target.value;
                            setReplyMaterials(updated);
                          }}
                          className="me-2"
                          style={{ width: '300px' }}
                        />
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => removeReplyMaterial(mat.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                    setReplyMaterials([]);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </Form>
          </div>
        )}
        
        {/* Nested Replies */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="nested-replies">
            {reply.replies.map(nestedReply => (
              <ReplyTree 
                key={nestedReply._id} 
                reply={nestedReply} 
                parentDiscussion={parentDiscussion}
                depth={depth + 1}
                chatId={chatId}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Component for displaying a full chat
  const ChatTab = ({ chat }) => {
    const isAuthor = user && (chat.author._id === user.id || chat.author._id === user._id);
    const isFaculty = user && (user.role === 'teacher' || user.role === 'admin');
    
    // State for new message in this chat
    const [newMessage, setNewMessage] = useState('');
    const [messageMaterials, setMessageMaterials] = useState([]);
    
    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      
      try {
        const messagePayload = {
          content: newMessage,
          parentDiscussionId: chat._id,
          referencedMaterials: messageMaterials.map(m => ({
            material: m.id,
            note: m.note || ''
          }))
        };

        await api.post(`/community-discussions/${communityId}`, messagePayload);
        
        // Clear form
        setNewMessage('');
        setMessageMaterials([]);
        
        // Reload the chat
        const updatedChat = await loadChat(chat._id);
        setOpenChats(openChats.map(c => c._id === chat._id ? updatedChat : c));
      } catch (err) {
        setError('Failed to send message: ' + (err.response?.data?.message || err.message));
        console.error('Send message error:', err);
      }
    };
    
    const addMessageMaterial = (material) => {
      if (!messageMaterials.find(m => m.id === material._id)) {
        setMessageMaterials([...messageMaterials, { id: material._id, title: material.title, note: '' }]);
      }
    };
    
    const removeMessageMaterial = (materialId) => {
      setMessageMaterials(messageMaterials.filter(m => m.id !== materialId));
    };

    return (
      <div className="chat-tab">
        {/* Chat Header */}
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <h5 className="mb-2">
                  {chat.isQuestion && <Badge bg="info" className="me-2">Question</Badge>}
                  {chat.title}
                </h5>
                
                <div className="d-flex align-items-center mb-2">
                  <strong>{chat.author.name}</strong>
                  <Badge bg={getRoleBadgeColor(chat.author.role)} className="ms-2">
                    {chat.author.role}
                  </Badge>
                  {chat.isPinned && <FaThumbtack className="ms-2 text-warning" title="Pinned" />}
                  {chat.isTerminated && <Badge bg="secondary" className="ms-2">Terminated</Badge>}
                  <small className="text-muted ms-2">
                    {new Date(chat.createdAt).toLocaleString()}
                  </small>
                  {chat.isEdited && <small className="text-muted ms-2">(Edited)</small>}
                </div>
                
                <p className="mb-2">{chat.content}</p>
                
                {/* Tags */}
                {chat.tags && chat.tags.length > 0 && (
                  <div className="mb-2">
                    {chat.tags.map((tag, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="me-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Referenced Materials */}
                {chat.referencedMaterials && chat.referencedMaterials.length > 0 && (
                  <div className="mb-2 p-2 bg-light rounded">
                    <small className="text-muted d-block mb-1">
                      <FaLink className="me-1" /> Referenced Materials:
                    </small>
                    {chat.referencedMaterials.map((ref, idx) => (
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
              </div>
              
              {/* Action Buttons */}
              <div className="d-flex align-items-center gap-2">
                {/* Like Button */}
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => handleLike(chat._id)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '5px 12px' }}
                >
                  <FaHeart className={chat.likes?.includes(user?.id) || chat.likes?.includes(user?._id) ? 'text-danger' : ''} style={{ fontSize: '14px' }} />
                  <span style={{ fontSize: '13px' }}>{chat.likeCount || 0}</span>
                </Button>
                
                {/* Reply Button */}
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => startReply(chat)}
                  className="d-flex align-items-center gap-1"
                  style={{ borderRadius: '20px', padding: '5px 12px' }}
                  disabled={chat.isTerminated}
                  title={chat.isTerminated ? 'Chat is terminated - replies are disabled' : 'Reply to this message'}
                >
                  <FaReply style={{ fontSize: '14px' }} />
                  <span style={{ fontSize: '13px' }}>Reply</span>
                </Button>
                
                {/* Pin Button */}
                {isFaculty && (
                  <Button 
                    variant="outline-warning" 
                    size="sm" 
                    onClick={() => handlePin(chat._id)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaThumbtack style={{ fontSize: '14px' }} /> 
                    <span style={{ fontSize: '13px' }}>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
                  </Button>
                )}
                
                {/* Edit Button */}
                {isAuthor && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => handleEdit(chat)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaEdit style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>Edit</span>
                  </Button>
                )}
                
                {/* Delete Button */}
                {(isAuthor || isFaculty) && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => handleDelete(chat._id)}
                    className="d-flex align-items-center gap-1"
                    style={{ borderRadius: '20px', padding: '5px 12px' }}
                  >
                    <FaTrash style={{ fontSize: '14px' }} />
                    <span style={{ fontSize: '13px' }}>Delete</span>
                  </Button>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>
        
        {/* Replies in Nested Format */}
        {chat.replies && chat.replies.length > 0 && (
          <div className="replies-section" style={{ marginTop: '20px', borderTop: '2px solid #e9ecef', paddingTop: '15px' }}>
            <h6 className="text-muted mb-3">
              <FaComment className="me-2" />
              {chat.replies.length} {chat.replies.length === 1 ? 'Reply' : 'Replies'}
            </h6>
            {chat.replies.map(reply => (
              <ReplyTree 
                key={reply._id} 
                reply={reply} 
                parentDiscussion={chat}
                depth={0}
                chatId={chat._id}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="community-forum">
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

      {/* Tabbed Interface */}
      <Tabs
        activeKey={activeChatTab}
        onSelect={(k) => setActiveChatTab(k)}
        className="mb-3"
      >
        {/* All Discussions Tab */}
        <Tab eventKey="all" title="All Discussions">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Button variant="primary" onClick={() => setShowNewChat(true)}>
                <FaComment /> New Chat
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

          {/* All Discussions List (Titles Only) */}
          {loading ? (
            <div className="text-center">Loading discussions...</div>
          ) : discussions.length === 0 ? (
            <Alert variant="info">No discussions yet. Be the first to start one!</Alert>
          ) : (
            discussions.map(discussion => (
              <DiscussionTitleCard key={discussion._id} discussion={discussion} />
            ))
          )}
        </Tab>
        
        {/* Open Chat Tabs */}
        {openChats.map(chat => (
          <Tab 
            eventKey={chat._id} 
            title={
              <span>
                {chat.title}
                <FaTimes 
                  className="ms-2 text-muted" 
                  style={{ fontSize: '0.8em', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeChatTab(chat._id);
                  }}
                />
              </span>
            }
            key={chat._id}
          >
            <ChatTab chat={chat} />
          </Tab>
        ))}
      </Tabs>

      {/* New Chat Modal */}
      <Modal show={showNewChat} onHide={() => setShowNewChat(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateChat}>
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
              <Button variant="secondary" onClick={() => setShowNewChat(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Chat
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Reply Modal */}
      <Modal show={showReplyModal} onHide={() => {
        setShowReplyModal(false);
        setReplyingTo(null);
        setSelectedDiscussion(null);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reply to {replyingTo?.author?.name || 'message'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {replyingTo && (
            <>
              <Card className="mb-3 bg-light">
                <Card.Body>
                  <strong>{replyingTo.title || 'Original Message'}</strong>
                  <p className="mt-2">{replyingTo.content}</p>
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
                  <Button variant="secondary" onClick={() => {
                    setShowReplyModal(false);
                    setReplyingTo(null);
                    setSelectedDiscussion(null);
                  }}>
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

export default CommunityForum;