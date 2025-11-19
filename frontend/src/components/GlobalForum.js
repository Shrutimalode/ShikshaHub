import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Modal, ListGroup, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { FaPlus, FaSearch, FaComment, FaHeart, FaCheckCircle, FaTimesCircle, FaClock, FaUserShield, FaTrash } from 'react-icons/fa';
import './GlobalForum.css';

const GlobalForum = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [pendingModeration, setPendingModeration] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Thread creation modal
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', description: '' });
  const [selectedModerators, setSelectedModerators] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  
  // Question posting
  const [newQuestion, setNewQuestion] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  
  // Moderation modal
  const [showModeration, setShowModeration] = useState(false);
  const [moderatingItem, setModeratingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Search
  const [discussionSearch, setDiscussionSearch] = useState('');

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    // Check if there's a threadId in URL params
    const searchParams = new URLSearchParams(location.search);
    const threadId = searchParams.get('threadId');
    
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t._id === threadId);
      if (thread) {
        setSelectedThread(thread);
      }
    }
  }, [location.search, threads]);

  useEffect(() => {
    if (selectedThread) {
      loadThreadDiscussions(selectedThread._id);
      if (isModeratorOrAdmin()) {
        loadPendingModeration(selectedThread._id);
      }
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/global-forum/threads');
      setThreads(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load threads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadDiscussions = async (threadId) => {
    try {
      console.log('Loading discussions for thread:', threadId);
      const response = await api.get(`/global-forum/threads/${threadId}/discussions`);
      console.log('Discussions loaded:', response.data);
      console.log('Number of discussions:', response.data.length);
      if (response.data.length > 0) {
        console.log('First discussion replies:', response.data[0].replies);
      }
      setDiscussions(response.data);
    } catch (err) {
      setError('Failed to load discussions');
      console.error('Load discussions error:', err);
    }
  };

  const loadPendingModeration = async (threadId) => {
    try {
      const response = await api.get(`/global-forum/threads/${threadId}/pending`);
      setPendingModeration(response.data);
    } catch (err) {
      console.error('Failed to load pending moderation:', err);
    }
  };

  const searchTeachers = async (search) => {
    try {
      const response = await api.get(`/global-forum/teachers?search=${search}`);
      setTeachers(response.data);
    } catch (err) {
      console.error('Failed to search teachers:', err);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/global-forum/threads', {
        ...newThread,
        moderatorIds: selectedModerators
      });
      setThreads([response.data, ...threads]);
      setShowCreateThread(false);
      setNewThread({ title: '', description: '' });
      setSelectedModerators([]);
      alert('Thread created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create thread');
    }
  };

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    try {
      await api.post(`/global-forum/threads/${selectedThread._id}/questions`, {
        content: newQuestion.trim()
      });
      setNewQuestion('');
      
      // Reload discussions for everyone (admins and moderators will see their posts immediately)
      loadThreadDiscussions(selectedThread._id);
      
      // Only show moderation message for non-moderators and non-admins
      if (!isModeratorOrAdmin()) {
        alert('Your question has been submitted for moderation!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post question');
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    
    console.log('=== handlePostReply called ===');
    console.log('replyContent:', replyContent);
    console.log('replyingTo:', replyingTo);
    
    if (!replyContent.trim() || !replyingTo) {
      console.log('Validation failed - empty content or no replyingTo');
      return;
    }
    
    try {
      console.log('Posting reply:', {
        threadId: selectedThread._id,
        discussionId: replyingTo._id,
        content: replyContent.trim()
      });
      
      const response = await api.post(`/global-forum/threads/${selectedThread._id}/discussions/${replyingTo._id}/replies`, {
        content: replyContent.trim()
      });
      
      console.log('Reply posted successfully:', response.data);
      console.log('Moderation status:', response.data.moderationStatus);
      
      setReplyContent('');
      setReplyingTo(null);
      
      // Reload discussions for everyone
      console.log('Reloading discussions...');
      await loadThreadDiscussions(selectedThread._id);
      console.log('Discussions reloaded');
      
      // Show appropriate message based on moderation status
      if (response.data.moderationStatus === 'pending') {
        alert('Your reply has been submitted for moderation!');
      } else {
        alert('Reply posted successfully!');
      }
    } catch (err) {
      console.error('Post reply error:', err);
      alert(err.response?.data?.message || 'Failed to post reply');
    }
  };

  const handleModerate = async (action) => {
    try {
      await api.post(`/global-forum/discussions/${moderatingItem._id}/moderate`, {
        action,
        reason: action === 'reject' ? rejectionReason : undefined
      });
      
      setShowModeration(false);
      setModeratingItem(null);
      setRejectionReason('');
      
      loadThreadDiscussions(selectedThread._id);
      loadPendingModeration(selectedThread._id);
      
      alert(`Content ${action}d successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Moderation failed');
    }
  };

  const handleLike = async (discussionId) => {
    try {
      await api.post(`/global-forum/discussions/${discussionId}/like`);
      loadThreadDiscussions(selectedThread._id);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleMarkAnswer = async (discussionId) => {
    // Show confirmation dialog
    const userConfirmed = window.confirm(
      'Are you satisfied with this answer?\n\nClicking OK will mark this as the answer and terminate the discussion.'
    );
    
    if (!userConfirmed) {
      return; // User cancelled
    }
    
    try {
      await api.post(`/global-forum/discussions/${discussionId}/mark-answer`);
      
      // Show success message
      alert('Answer marked successfully! The discussion has been terminated.');
      
      // Reload discussions
      loadThreadDiscussions(selectedThread._id);
    } catch (err) {
      console.error('Mark answer error:', err);
      alert('Failed to mark answer. Please try again.');
    }
  };

  const handleDelete = async (discussionId) => {
    if (!window.confirm('Are you sure you want to delete this? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/global-forum/discussions/${discussionId}`);
      alert('Deleted successfully!');
      loadThreadDiscussions(selectedThread._id);
      if (isModeratorOrAdmin()) {
        loadPendingModeration(selectedThread._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
      console.error('Delete error:', err);
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!window.confirm('Are you sure you want to delete this thread? All discussions in this thread will become inaccessible.')) {
      return;
    }

    try {
      await api.delete(`/global-forum/threads/${threadId}`);
      alert('Thread deleted successfully!');
      loadThreads();
      setSelectedThread(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete thread');
      console.error('Delete thread error:', err);
    }
  };

  const isModeratorOrAdmin = () => {
    if (!selectedThread || !user) return false;
    return user.role === 'admin' || selectedThread.moderators.some(mod => mod._id === user.id);
  };

  const openModerationModal = (item) => {
    setModeratingItem(item);
    setShowModeration(true);
  };

  const filteredDiscussions = discussions.filter(disc =>
    disc.content.toLowerCase().includes(discussionSearch.toLowerCase()) ||
    disc.author.name.toLowerCase().includes(discussionSearch.toLowerCase())
  );

  // Helper function to find a reply in nested tree
  const findReplyInTree = (reply, targetId) => {
    if (reply._id === targetId) return true;
    if (reply.replies && reply.replies.length > 0) {
      return reply.replies.some(r => findReplyInTree(r, targetId));
    }
    return false;
  };

  // Recursive Reply Component
  const ReplyTree = ({ reply, depth = 0 }) => {
    const marginLeft = depth * 30;
    const isAuthor = reply.author._id === user?.id;
    
    // Find the root discussion to check termination status
    const rootDiscussion = discussions.find(disc => 
      disc._id === reply.parentDiscussion || 
      disc.replies?.some(r => findReplyInTree(r, reply._id))
    );
    const isDiscussionTerminated = rootDiscussion?.isTerminated || false;
    
    // Check if user can mark answer (only question author, moderators, or admins)
    const isQuestionAuthor = rootDiscussion && rootDiscussion.author._id === user?.id;
    const canMarkAnswer = rootDiscussion?.isQuestion && (isQuestionAuthor || isModeratorOrAdmin()) && !isDiscussionTerminated;
    
    return (
      <div style={{ marginLeft: `${marginLeft}px`, marginTop: '10px' }}>
        <Card className="mb-2" style={{ backgroundColor: depth === 0 ? '#f8f9fa' : '#fff', border: '1px solid #dee2e6' }}>
          <Card.Body style={{ padding: '12px' }}>
            <div className="d-flex align-items-center mb-2">
              <strong>{reply.author.name}</strong>
              <Badge bg={reply.authorRole === 'admin' ? 'danger' : reply.authorRole === 'teacher' ? 'primary' : 'secondary'} className="ms-2" style={{ fontSize: '0.7rem' }}>
                {reply.authorRole}
              </Badge>
              {reply.isMarkedAsAnswer && (
                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem' }}>
                  <FaCheckCircle /> Marked Answer
                </Badge>
              )}
              {reply.moderationStatus === 'pending' && (
                <Badge bg="warning" className="ms-2" style={{ fontSize: '0.7rem' }}>
                  <FaClock /> Pending
                </Badge>
              )}
              {reply.moderationStatus === 'rejected' && (
                <Badge bg="danger" className="ms-2" style={{ fontSize: '0.7rem' }}>
                  <FaTimesCircle /> Rejected
                </Badge>
              )}
              <small className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                {new Date(reply.createdAt).toLocaleString()}
              </small>
            </div>
            
            <p className="mb-2" style={{ fontSize: '0.95rem' }}>{reply.content}</p>
            
            {reply.rejectionReason && (
              <Alert variant="danger" className="mb-2 py-1 px-2" style={{ fontSize: '0.85rem' }}>
                <strong>Rejection Reason:</strong> {reply.rejectionReason}
              </Alert>
            )}
            
            <div className="d-flex align-items-center gap-1">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleLike(reply._id)}
                style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <FaHeart className={reply.likes?.includes(user?.id) ? 'text-danger' : ''} style={{ fontSize: '12px' }} />
                {reply.likeCount > 0 && <span className="ms-1">{reply.likeCount}</span>}
              </Button>
              
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => setReplyingTo(reply)}
                style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                disabled={isDiscussionTerminated}
                title={isDiscussionTerminated ? 'Discussion is terminated - replies are disabled' : 'Reply to this message'}
              >
                <FaComment style={{ fontSize: '12px' }} /> Reply
              </Button>
              
              {canMarkAnswer && !reply.isMarkedAsAnswer && (
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  onClick={() => handleMarkAnswer(reply._id)}
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                  title="Mark this as the answer and terminate the discussion"
                >
                  <FaCheckCircle style={{ fontSize: '12px' }} /> Mark Answer
                </Button>
              )}
              
              {isModeratorOrAdmin() && reply.moderationStatus === 'pending' && (
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  onClick={() => openModerationModal(reply)}
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  <FaUserShield style={{ fontSize: '12px' }} /> Moderate
                </Button>
              )}
              
              {isAuthor && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => handleDelete(reply._id)}
                  style={{ borderRadius: '20px', padding: '4px 10px', fontSize: '0.8rem' }}
                  title="Delete your reply"
                >
                  <FaTrash style={{ fontSize: '12px' }} />
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
        
        {reply.replies && reply.replies.length > 0 && (
          <div className="nested-replies">
            {reply.replies.map(nestedReply => (
              <ReplyTree key={nestedReply._id} reply={nestedReply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading Open Discussion Forum...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="global-forum-container mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Open Discussion Forum</h2>
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => setShowCreateThread(true)}>
                <FaPlus /> Create Thread
              </Button>
            )}
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
        </Col>
      </Row>

      <Row>
        {/* Left Sidebar - Thread List */}
        <Col md={3} className="thread-list-sidebar">
          <Card>
            <Card.Header>
              <h5>Groups</h5>
            </Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {threads.map(thread => (
                <ListGroup.Item 
                  key={thread._id}
                  active={selectedThread?._id === thread._id}
                  onClick={() => setSelectedThread(thread)}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{thread.title}</strong>
                  <p className="mb-1 small text-muted">{thread.description.substring(0, 60)}...</p>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="info" pill style={{ fontSize: '0.7rem' }}>
                      <FaUserShield /> {thread.moderators.length} Moderator{thread.moderators.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </ListGroup.Item>
              ))}
              {threads.length === 0 && (
                <ListGroup.Item>
                  <p className="text-muted mb-0">No threads yet</p>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>

        {/* Right Side - Discussion Area */}
        <Col md={9}>
          {selectedThread ? (
            <>
              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <Row>
                    {/* Left Side - Thread Info */}
                    <Col md={6}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h4 className="mb-2">{selectedThread.title}</h4>
                          <p className="mb-2 text-muted">{selectedThread.description}</p>
                          <div className="mt-2">
                            <strong className="text-secondary">Moderators: </strong>
                            {selectedThread.moderators.length === 0 ? (
                              <span className="text-muted">No moderators assigned</span>
                            ) : (
                              <div className="mt-1">
                                {selectedThread.moderators.map((mod, idx) => (
                                  <Badge key={mod._id} bg="primary" className="me-1 mb-1 p-2" style={{ fontSize: '0.75rem' }}>
                                    <strong>{mod.name}</strong>
                                    {mod.expertise && mod.expertise.length > 0 && (
                                      <span className="ms-1" style={{ opacity: 0.9 }}>| {mod.expertise.join(', ')}</span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {user && selectedThread.createdBy && selectedThread.createdBy._id === user.id && (
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDeleteThread(selectedThread._id)}
                              title="Delete this thread"
                              className="mt-2"
                            >
                              <FaTrash /> Delete Thread
                            </Button>
                          )}
                        </div>
                      </div>
                    </Col>
                    
                    {/* Right Side - Ask Question Form */}
                    <Col md={6}>
                      <div className="border-start ps-3" style={{ borderLeftWidth: '2px' }}>
                        <h6 className="mb-3"><FaPlus className="me-2" />Ask a Question</h6>
                        <Form onSubmit={handlePostQuestion}>
                          <Form.Group className="mb-2">
                            <Form.Control 
                              as="textarea"
                              rows={4}
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              placeholder="Type your question here..."
                              required
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Group>
                          <div className="d-flex justify-content-between align-items-center flex-wrap">
                            <Button variant="primary" type="submit" size="sm" style={{ borderRadius: '20px', padding: '6px 20px' }}>
                             Post Question
                            </Button>
                            {!isModeratorOrAdmin() && (
                              <small className="text-muted">Will be reviewed by moderators</small>
                            )}
                          </div>
                        </Form>
                      </div>
                    </Col>
                  </Row>
                </Card.Header>
              </Card>

              {/* Pending Moderation Section */}
              {isModeratorOrAdmin() && pendingModeration.length > 0 && (
                <Alert variant="warning" className="mb-3">
                  <strong><FaClock /> {pendingModeration.length} item(s) pending moderation</strong>
                  <ListGroup className="mt-2">
                    {pendingModeration.slice(0, 3).map(item => (
                      <ListGroup.Item key={item._id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{item.author.name}:</strong> {item.content.substring(0, 50)}...
                        </div>
                        <Button size="sm" variant="warning" onClick={() => openModerationModal(item)}>
                          Review
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Alert>
              )}

              {/* Search Bar */}
              <Form.Group className="mb-3">
                <Form.Control 
                  type="text"
                  placeholder="🔍 Search discussions..."
                  value={discussionSearch}
                  onChange={(e) => setDiscussionSearch(e.target.value)}
                  style={{ borderRadius: '25px', padding: '10px 20px' }}
                />
              </Form.Group>

              {/* Reply Form */}
              {replyingTo && (
                <Card className="mb-3 border-primary">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6>Replying to {replyingTo.author.name}</h6>
                      <Button variant="link" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    </div>
                    <p className="small text-muted">{replyingTo.content.substring(0, 100)}...</p>
                    <Form onSubmit={handlePostReply}>
                      <Form.Group className="mb-2">
                        <Form.Control 
                          as="textarea"
                          rows={3}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your reply..."
                          required
                        />
                      </Form.Group>
                      <Button variant="primary" type="submit" size="sm">
                        Post Reply
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              )}

              {/* Discussions List */}
              <div className="discussions-container">
                {filteredDiscussions.map(discussion => {
                  const isAuthor = discussion.author._id === user?.id;
                  
                  return (
                    <Card key={discussion._id} className="mb-3">
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <strong>{discussion.author.name}</strong>
                          <Badge bg={discussion.authorRole === 'admin' ? 'danger' : discussion.authorRole === 'teacher' ? 'primary' : 'secondary'} className="ms-2">
                            {discussion.authorRole}
                          </Badge>
                          {discussion.moderationStatus === 'pending' && (
                            <Badge bg="warning" className="ms-2">
                              <FaClock /> Pending
                            </Badge>
                          )}
                          {discussion.isTerminated && (
                            <Badge bg="secondary" className="ms-2">
                              Terminated
                            </Badge>
                          )}
                          <small className="text-muted ms-2">
                            {new Date(discussion.createdAt).toLocaleString()}
                          </small>
                        </div>
                        
                        <p className="mb-2">{discussion.content}</p>
                        
                        <div className="d-flex align-items-center gap-2">
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => handleLike(discussion._id)}
                          >
                            <FaHeart className={discussion.likes?.includes(user?.id) ? 'text-danger' : ''} />
                            {discussion.likeCount > 0 && <span className="ms-1">{discussion.likeCount}</span>}
                          </Button>
                          
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => setReplyingTo(discussion)}
                            disabled={discussion.isTerminated}
                            title={discussion.isTerminated ? 'Discussion is terminated - replies are disabled' : 'Reply to this discussion'}
                          >
                            <FaComment /> Reply ({discussion.replyCount})
                          </Button>
                          
                          {isModeratorOrAdmin() && discussion.moderationStatus === 'pending' && (
                            <Button 
                              variant="outline-warning" 
                              size="sm" 
                              onClick={() => openModerationModal(discussion)}
                            >
                              <FaUserShield /> Moderate
                            </Button>
                          )}
                          
                          {isAuthor && (
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => handleDelete(discussion._id)}
                              title="Delete your question"
                            >
                              <FaTrash /> Delete
                            </Button>
                          )}
                        </div>
                        
                        {/* Nested Replies */}
                        {discussion.replies && discussion.replies.length > 0 && (
                          <div className="replies-section mt-3 pt-3 border-top">
                            <h6 className="text-muted mb-3">
                              <FaComment /> {discussion.replies.length} {discussion.replies.length === 1 ? 'Reply' : 'Replies'}
                            </h6>
                            {discussion.replies.map(reply => (
                              <ReplyTree key={reply._id} reply={reply} depth={0} />
                            ))}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  );
                })}
                
                {filteredDiscussions.length === 0 && (
                  <Card>
                    <Card.Body className="text-center text-muted">
                      <p>No discussions yet. Be the first to ask a question!</p>
                    </Card.Body>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card>
              <Card.Body className="text-center text-muted">
                <h5>Select a thread to view discussions</h5>
                <p>Choose a thread from the left sidebar to start participating</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Create Thread Modal */}
      <Modal show={showCreateThread} onHide={() => setShowCreateThread(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Thread</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateThread}>
            <Form.Group className="mb-3">
              <Form.Label>Thread Title</Form.Label>
              <Form.Control 
                type="text"
                value={newThread.title}
                onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                placeholder="Enter thread title"
                required
                maxLength={200}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea"
                rows={4}
                value={newThread.description}
                onChange={(e) => setNewThread({ ...newThread, description: e.target.value })}
                placeholder="Describe the thread topic"
                required
                maxLength={1000}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Assign Moderators</Form.Label>
              <Form.Control 
                type="text"
                placeholder="Search teachers by name, email, or expertise..."
                value={teacherSearch}
                onChange={(e) => {
                  setTeacherSearch(e.target.value);
                  if (e.target.value.length > 2) {
                    searchTeachers(e.target.value);
                  }
                }}
              />
              
              {teachers.length > 0 && (
                <ListGroup className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {teachers.map(teacher => (
                    <ListGroup.Item 
                      key={teacher._id}
                      onClick={() => {
                        if (!selectedModerators.includes(teacher._id)) {
                          setSelectedModerators([...selectedModerators, teacher._id]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      active={selectedModerators.includes(teacher._id)}
                    >
                      <div>
                        <strong>{teacher.name}</strong> <span className="text-muted">- {teacher.email}</span>
                      </div>
                      {teacher.expertise && teacher.expertise.length > 0 && (
                        <div className="mt-1">
                          <small className="text-muted">Skills: </small>
                          {teacher.expertise.map((skill, idx) => (
                            <Badge key={idx} bg="info" className="me-1" style={{ fontSize: '0.75rem' }}>
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(!teacher.expertise || teacher.expertise.length === 0) && (
                        <div className="mt-1">
                          <small className="text-muted fst-italic">No expertise added yet</small>
                        </div>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              
              {selectedModerators.length > 0 && (
                <div className="mt-2">
                  <strong>Selected Moderators:</strong>
                  <div className="mt-2">
                    {selectedModerators.map(modId => {
                      const teacher = teachers.find(t => t._id === modId);
                      return teacher ? (
                        <div key={modId} className="d-inline-block me-2 mb-2">
                          <Badge bg="primary" className="p-2" style={{ fontSize: '0.85rem' }}>
                            <strong>{teacher.name}</strong>
                            {teacher.expertise && teacher.expertise.length > 0 && (
                              <span className="ms-1">({teacher.expertise.join(', ')})</span>
                            )}
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="text-white p-0 ms-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedModerators(selectedModerators.filter(id => id !== modId));
                              }}
                              style={{ textDecoration: 'none', fontSize: '1.2rem', lineHeight: '1' }}
                            >
                              ×
                            </Button>
                          </Badge>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </Form.Group>
            
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreateThread(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Thread
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Moderation Modal */}
      <Modal show={showModeration} onHide={() => setShowModeration(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Moderate Content</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {moderatingItem && (
            <>
              <p><strong>Author:</strong> {moderatingItem.author.name} ({moderatingItem.authorRole})</p>
              <p><strong>Content:</strong></p>
              <Card className="mb-3">
                <Card.Body>{moderatingItem.content}</Card.Body>
              </Card>
              
              <Form.Group className="mb-3">
                <Form.Label>Rejection Reason (if rejecting)</Form.Label>
                <Form.Control 
                  as="textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => handleModerate('reject')}>
            <FaTimesCircle /> Reject
          </Button>
          <Button variant="success" onClick={() => handleModerate('approve')}>
            <FaCheckCircle /> Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GlobalForum;
