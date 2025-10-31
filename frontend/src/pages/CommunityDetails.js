import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Tab, Nav, Form, 
  Badge, Alert, Spinner, ListGroup, Modal, Offcanvas 
} from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import BlogList from '../components/BlogList';
import CommunitySidePanel from '../components/CommunitySidePanel';
import CommunityForum from '../components/CommunityForum';

const CommunityDetails = () => {
  // Router hooks
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Auth context
  const { user, token } = useAuth();

  // Community state
  const [community, setCommunity] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Material action loading states
  const [loadingMaterialAction, setLoadingMaterialAction] = useState({});
  

  // UI state
  const [activeTab, setActiveTab] = useState('materials');
  
  // Membership state
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Blog state
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [blogError, setBlogError] = useState('');

  // Material upload state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    file: null
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Member management state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Event state
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    links: '',
    location: '',
    date: '',
    time: '',
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventSuccess, setEventSuccess] = useState('');

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false);

  // Fetch blogs with useCallback
  const fetchBlogs = useCallback(async () => {
    setLoadingBlogs(true);
    setBlogError('');
    
    try {
      const res = await api.get(`/blogs/community/${id}`);
      setBlogs(res.data);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setBlogError('Failed to load blogs. Please try again later.');
    }
    
    setLoadingBlogs(false);
  }, [id]);

  // Fetch events with useCallback
  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get(`/communities/${id}/events`);
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, [id]);

  // Fetch community details
  useEffect(() => {
    const fetchCommunityDetails = async () => {
      try {
        const res = await api.get(`/communities/${id}`);
        setCommunity(res.data);
        
        // Check for pending join request
        if (res.data.joinRequests && user) {
          const userRequest = res.data.joinRequests.find(
            req => req.user === user.id || req.user === user._id || 
                 (req.user._id && (req.user._id === user.id || req.user._id === user._id))
          );
          
          if (userRequest) {
            setRequestStatus(userRequest.status);
          }
        }
        
        // Fetch materials
        const materialsRes = await api.get(`/materials/community/${id}`);
        setMaterials(materialsRes.data);
        
        // Fetch blogs and events
        fetchBlogs();
        fetchEvents();
      } catch (err) {
        let errorMessage = 'Failed to load community details. Please try again later.';
        
        if (err.response?.status === 403) {
          errorMessage = 'You do not have permission to view this community.';
          if (err.response.data?.communityBasic) {
            setCommunity(err.response.data.communityBasic);
          }
          
          if (err.response.data?.joinRequests?.length > 0) {
            setRequestStatus('pending');
          }
        } else if (err.response?.status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
        }
        
        setError(errorMessage);
      }
      setLoading(false);
    };

    fetchCommunityDetails();
  }, [id, user, fetchBlogs, fetchEvents]);

  // Fetch join requests if admin
  useEffect(() => {
    const fetchJoinRequests = async () => {
      if (!community || !user) return;
      
      const isAdminUser = community.admin._id === user.id || community.admin._id === user._id;
      if (!isAdminUser) return;
      
      setLoadingRequests(true);
      
      try {
        const res = await api.get(`/communities/${id}/requests`);
        setJoinRequests(res.data);
      } catch (err) {
        console.error('Error fetching join requests:', err);
      }
      
      setLoadingRequests(false);
    };
    
    fetchJoinRequests();
  }, [community, user, id]);

  // Check if user is admin
  const isAdmin = community && user && (community.admin._id === user.id || community.admin._id === user._id);

  // Handle material upload
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.title || !uploadForm.description || !uploadForm.file) {
      setUploadError('Please fill in all required fields and select a file');
      return;
    }
    
    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('communityId', id);
      formData.append('tags', uploadForm.tags);
      formData.append('file', uploadForm.file);
      
      const res = await api.post('/materials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMaterials([res.data, ...materials]);
      setUploadForm({
        title: '',
        description: '',
        tags: '',
        file: null
      });
      setUploadSuccess('Material uploaded successfully!');
      document.getElementById('file-upload').value = '';
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload material');
      console.error('Error uploading material:', err);
    }
    
    setUploadLoading(false);
  };

  // Handle material download
  const handleDownloadMaterial = async (materialId, originalFileName) => {
    // Set loading state for this specific material
    setLoadingMaterialAction(prev => ({ ...prev, [`download-${materialId}`]: true }));
    
    try {
      const res = await api.get(`/materials/download/${materialId}`, {
        responseType: 'blob',
        headers: {
          'x-auth-token': token
        }
      });

      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download material. Please try again.');
      console.error('Error downloading material:', err.response || err);
    } finally {
      // Clear loading state
      setLoadingMaterialAction(prev => ({ ...prev, [`download-${materialId}`]: false }));
    }
  };

// Handle material view
const handleViewMaterial = async (materialId) => {
  // Set loading state for this specific material
  setLoadingMaterialAction(prev => ({ ...prev, [`view-${materialId}`]: true }));
  
  try {
    const res = await api.get(`/materials/download/${materialId}?view=true`, {
      responseType: 'blob',
      headers: { 'x-auth-token': token }
    });

    // If you want to open the file in a new tab:
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Optionally, revoke the object URL after some time
    setTimeout(() => window.URL.revokeObjectURL(url), 1000 * 60);
  } catch (error) {
    alert('Failed to view material. Please try again.');
    console.error('Error viewing material:', error);
  } finally {
    // Clear loading state
    setLoadingMaterialAction(prev => ({ ...prev, [`view-${materialId}`]: false }));
  }
};

  
  // Handle join request
  const handleRequestToJoin = async () => {
    setRequestLoading(true);
    setRequestMessage('');
    
    try {
      const res = await api.post('/communities/request', {
        communityId: id
      });
      
      setRequestStatus('pending');
      setRequestMessage(res.data.message);
    } catch (error) {
      setRequestMessage(error.response?.data?.message || 'Failed to send join request');
      console.error('Error sending join request:', error);
    }
    
    setRequestLoading(false);
  };
  
  // Handle join request response (approve/reject)
  const handleJoinRequestResponse = async (userId, status) => {
    try {
      await api.put('/communities/request/handle', {
        communityId: id,
        userId,
        status
      });
      
      // Update join requests list
      setJoinRequests(joinRequests.filter(request => request.user._id !== userId));
      
      // If approved, update community members
      if (status === 'approved') {
        const updatedRequest = joinRequests.find(request => request.user._id === userId);
        
        if (updatedRequest) {
          const userRole = updatedRequest.user.role;
          
          if (userRole === 'teacher') {
            setCommunity({
              ...community,
              teachers: [...community.teachers, updatedRequest.user]
            });
          } else {
            setCommunity({
              ...community,
              students: [...community.students, updatedRequest.user]
            });
          }
        }
      }
    } catch (error) {
      alert('Failed to process join request. Please try again.');
      console.error('Error processing join request:', error);
    }
  };
  
  // Handle blog deletion
  const handleDeleteBlog = async (blogId) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await api.delete(`/blogs/${blogId}`);
        
        // Remove blog from list
        setBlogs(blogs.filter(blog => blog._id !== blogId));
      } catch (error) {
        alert('Failed to delete blog post. Please try again.');
        console.error('Error deleting blog post:', error);
      }
    }
  };
  
  // Handle blog review
  const handleReviewBlog = async (blogId, status, feedback) => {
    try {
      await api.put(`/blogs/review/${blogId}`, {
        status,
        reviewComment: feedback
      });
      
      // Refresh blogs to show updated status
      fetchBlogs();
    } catch (error) {
      alert('Failed to review blog post. Please try again.');
      console.error('Error reviewing blog post:', error);
    }
  };

  // Member removal state
  const openRemoveModal = (member, role) => {
    setMemberToRemove({ ...member, role });
    setShowRemoveModal(true);
  };

  const handleRemoveMember = async () => {
    setRemoveLoading(true);
    
    try {
      await api.put('/communities/members/remove', {
        communityId: id,
        userId: memberToRemove._id,
        role: memberToRemove.role
      });
      
      // Update community state
      if (memberToRemove.role === 'teacher') {
        setCommunity({
          ...community,
          teachers: community.teachers.filter(t => t._id !== memberToRemove._id)
        });
      } else if (memberToRemove.role === 'student') {
        setCommunity({
          ...community,
          students: community.students.filter(s => s._id !== memberToRemove._id)
        });
      }
      
      setShowRemoveModal(false);
    } catch (error) {
      alert('Failed to remove member. Please try again.');
      console.error('Error removing member:', error);
    }
    
    setRemoveLoading(false);
  };

  // Handle community deletion
  const handleDeleteCommunity = async () => {
    if (window.confirm('Are you sure you want to delete this community? This action cannot be undone.')) {
      try {
        await api.delete(`/communities/${id}`);
        navigate('/dashboard');
      } catch (error) {
        alert('Failed to delete community. Please try again.');
        console.error('Error deleting community:', error);
      }
    }
  };

  // Check if user can delete a material
  const canDeleteMaterial = (material) => {
    return isAdmin || (user && (material.author._id === user.id || material.author._id === user._id));
  };

  // Handle event form changes
  const handleEventChange = (e) => {
    setEventForm({
      ...eventForm,
      [e.target.name]: e.target.value,
    });
  };

  // Handle event creation
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!eventForm.title || !eventForm.description || !eventForm.date || !eventForm.time) {
      setEventError('Please fill in all required fields (Title, Description, Date, Time)');
      return;
    }

    setEventLoading(true);
    setEventError('');
    setEventSuccess('');

    try {
      const res = await api.post(`/communities/${id}/events`, eventForm);
      setEvents([res.data, ...events]); // Add new event to the list
      setEventSuccess('Event created successfully!');
      setEventForm({
        title: '',
        description: '',
        links: '',
        location: '',
        date: '',
        time: '',
      });
      setShowCreateEventModal(false);
    } catch (error) {
      setEventError(error.response?.data?.message || 'Failed to create event');
      console.error('Error creating event:', error);
    }
    setEventLoading(false);
  };

  // Filter and sort events (upcoming at top, past vanish)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.date.split('T')[0]; // Extract YYYY-MM-DD
    const dateB = b.date.split('T')[0]; // Extract YYYY-MM-DD
    const dateTimeA = new Date(`${dateA}T${a.time}`);
    const dateTimeB = new Date(`${dateB}T${b.time}`);
    return dateTimeA - dateTimeB;
  });

  const upcomingEvents = sortedEvents.filter(event => {
    const eventDate = event.date.split('T')[0]; // Extract YYYY-MM-DD
    const eventDateTime = new Date(`${eventDate}T${event.time}`);
    return eventDateTime > new Date();
  });

  // Add this function to handle material deletion
  const handleDeleteMaterial = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      // Set loading state for this specific material
      setLoadingMaterialAction(prev => ({ ...prev, [`delete-${materialId}`]: true }));
      
      try {
        await api.delete(`/materials/${materialId}`);
        setMaterials(materials.filter(material => material._id !== materialId));
      } catch (error) {
        alert('Failed to delete material. Please try again.');
        console.error('Error deleting material:', error);
      } finally {
        // Clear loading state
        setLoadingMaterialAction(prev => ({ ...prev, [`delete-${materialId}`]: false }));
      }
    }
  };

  // Add this function to handle upload form changes
  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setUploadForm(prev => ({ ...prev, file: files[0] }));
    } else {
      setUploadForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Container className="spinner-container">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // Render loading spinner
  if (loading) {
    return (
      <Container className="spinner-container">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // Render error message with Request to Join button if appropriate
  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          {error}
          {error === 'You do not have permission to view this community.' && user && (
            <div className="mt-3">
              {requestStatus === 'pending' ? (
                <Alert variant="info">
                  Your request to join this community is pending approval from the admin.
                </Alert>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={handleRequestToJoin}
                  disabled={requestLoading}
                >
                  {requestLoading ? 'Sending Request...' : 'Request to Join'}
                </Button>
              )}
              {requestMessage && (
                <Alert variant="info" className="mt-2">
                  {requestMessage}
                </Alert>
              )}
            </div>
          )}
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      {community && (
        <>
          {/* Header Row - full width, no padding on mobile */}
          <div className="community-header-row position-relative" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
            <div className="d-flex align-items-center mb-4 position-relative" style={{ minHeight: '48px' }}>
              {/* Left: Sidebar open button for mobile */}
              <Button
                variant="link"
                className="d-lg-none p-0 m-0 border-0 position-absolute"
                style={{ left: '24px', boxShadow: 'none', zIndex: 2, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowSidebar(true)}
                aria-label="Open sidebar menu"
                title="Open side panel for more menus"
              >
                <i className="fas fa-bars fa-lg"></i>
              </Button>
              {/* Center: Community title */}
              <div className="position-absolute w-100 d-flex justify-content-center" style={{ left: 0, top: 0, height: '100%' }}>
                <h2 className="mb-0" style={{ lineHeight: '48px' }}>{community?.name || 'Community'}</h2>
              </div>
              {/* Right: Invisible placeholder for balance */}
              <div style={{ width: '40px' }} className="d-none d-lg-block"></div>
            </div>
          </div>
          
          <Row>
            {/* Main Content */}
            <Col md={8}>
              <Card className="shadow-sm mb-4">
                <Card.Body>
                  <Card.Title>Description</Card.Title>
                  <Card.Text>{community.description}</Card.Text>
                  <div className="mt-3">
                    <Badge bg="secondary" className="me-2">
                      {(community.teachers?.length || 0) + (community.students?.length || 0) + 1} Members
                    </Badge>
                    <Badge bg="info" className="me-2">
                      {community.blogs?.length || 0} Blogs
                    </Badge>
                    <Badge bg="primary">
                      {community.materials?.length || 0} Materials
                    </Badge>
                  </div>
                </Card.Body>
              </Card>

              <Tab.Container id="community-tabs" activeKey={activeTab} onSelect={k => setActiveTab(k)}>
                <Nav variant="tabs" className="mb-3 flex-row" style={{ flexWrap: 'nowrap' }}>
                  <Nav.Item>
                    <Nav.Link eventKey="members">Members</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="forum">Forum</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="materials">Materials</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="blogs">Blogs</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="events">Events</Nav.Link>
                  </Nav.Item>
                  {isAdmin && joinRequests.length > 0 && (
                    <Nav.Item>
                      <Nav.Link eventKey="requests">
                        Join Requests <Badge bg="danger">{joinRequests.length}</Badge>
                      </Nav.Link>
                    </Nav.Item>
                  )}
                </Nav>
                
                <Tab.Content>
                  <Tab.Pane eventKey="members">
                    <Row>
                      <Col md={4}>
                        <Card className="mb-3">
                          <Card.Body>
                            <Card.Title>Admin</Card.Title>
                            <ListGroup variant="flush">
                              <ListGroup.Item>
                                <i className="fas fa-user-shield me-2"></i>
                                {community.admin?.name || 'Admin'}
                              </ListGroup.Item>
                            </ListGroup>
                          </Card.Body>
                        </Card>
                      </Col>
                      
                      <Col md={4}>
                        <Card className="mb-3">
                          <Card.Body>
                            <Card.Title>Teachers</Card.Title>
                            {community.teachers?.length > 0 ? (
                              <ListGroup variant="flush">
                                {community.teachers.map(teacher => (
                                  <ListGroup.Item 
                                    key={teacher._id}
                                    className="d-flex justify-content-between align-items-center"
                                  >
                                    <span>
                                      <i className="fas fa-chalkboard-teacher me-2"></i>
                                      {teacher.name}
                                    </span>
                                    {isAdmin && (
                                      <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => openRemoveModal(teacher, 'teacher')}
                                      >
                                        <i className="fas fa-user-minus"></i>
                                      </Button>
                                    )}
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            ) : (
                              <p className="text-muted small">No teachers have joined yet</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      
                      <Col md={4}>
                        <Card>
                          <Card.Body>
                            <Card.Title>Students</Card.Title>
                            {community.students?.length > 0 ? (
                              <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {community.students.map(student => (
                                  <ListGroup.Item 
                                    key={student._id}
                                    className="d-flex justify-content-between align-items-center"
                                  >
                                    <span>
                                      <i className="fas fa-user-graduate me-2"></i>
                                      {student.name}
                                    </span>
                                    {isAdmin && (
                                      <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => openRemoveModal(student, 'student')}
                                      >
                                        <i className="fas fa-user-minus"></i>
                                      </Button>
                                    )}
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            ) : (
                              <p className="text-muted small">No students have joined yet</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="forum">
                    <CommunityForum communityId={id} />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="materials">
                    {materials.length === 0 ? (
                      <Alert variant="info">
                        No materials have been uploaded to this community yet.
                      </Alert>
                    ) : (
                      <ListGroup>
                        {materials.map(material => (
                          <ListGroup.Item 
                            key={material._id}
                            className="material-list-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <h5>{material.title}</h5>
                              <p className="mb-1 text-muted">{material.description}</p>
                              <div>
                                <small className="text-muted">
                                  Uploaded by: {material.author?.name || 'Unknown'} | 
                                  {' '}{new Date(material.createdAt).toLocaleString()}
                                </small>
                              </div>
                              {material.tags && material.tags.length > 0 && (
                                <div className="mt-1">
                                  {material.tags.map((tag, index) => (
                                    <Badge 
                                      key={index} 
                                      bg="secondary" 
                                      className="me-1"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="material-action-row">
                              <Button 
                                variant="light"
                                size="sm"
                                className="me-2 material-action-btn view"
                                style={{ border: 'none', borderRadius: '6px', background: '#4a154b', padding: '4px 8px' }}
                                onClick={() => handleViewMaterial(material._id)}
                                title="View Material"
                                disabled={loadingMaterialAction[`view-${material._id}`]}
                              >
                                {loadingMaterialAction[`view-${material._id}`] ? (
                                  <Spinner animation="border" size="sm" style={{ color: '#fff' }} />
                                ) : (
                                  <i className="fas fa-eye" style={{ color: '#fff' }}></i>
                                )}
                              </Button>
                              <Button 
                                variant="light"
                                size="sm"
                                className="me-2 material-action-btn download"
                                style={{ border: 'none', borderRadius: '6px', background: '#1e88e5', padding: '4px 8px' }}
                                onClick={() => handleDownloadMaterial(material._id, material.originalFileName)}
                                title="Download Material"
                                disabled={loadingMaterialAction[`download-${material._id}`]}
                              >
                                {loadingMaterialAction[`download-${material._id}`] ? (
                                  <Spinner animation="border" size="sm" style={{ color: '#fff' }} />
                                ) : (
                                  <i className="fas fa-download" style={{ color: '#fff' }}></i>
                                )}
                              </Button>
                              {canDeleteMaterial(material) && (
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  onClick={() => handleDeleteMaterial(material._id)}
                                  title="Delete Material"
                                  disabled={loadingMaterialAction[`delete-${material._id}`]}
                                >
                                  {loadingMaterialAction[`delete-${material._id}`] ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    <i className="fas fa-trash-alt"></i>
                                  )}
                                </Button>
                              )}
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="blogs">
                    {loadingBlogs ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" size="sm" /> Loading blogs...
                      </div>
                    ) : blogError ? (
                      <Alert variant="danger">{blogError}</Alert>
                    ) : (
                      <BlogList 
                        blogs={blogs} 
                        communityId={id} 
                        isAdmin={isAdmin} 
                        onDelete={handleDeleteBlog} 
                        onReview={(blogId, status, feedback) => handleReviewBlog(blogId, status, feedback)}
                      />
                    )}
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="events">
                    {upcomingEvents.length === 0 ? (
                      <Alert variant="info">
                        No upcoming events for this community.
                      </Alert>
                    ) : (
                      <ListGroup>
                        {upcomingEvents.map(event => (
                          <ListGroup.Item key={event._id} className="event-list-item">
                            <h5>{event.title}</h5>
                            <p className="mb-1">{event.description}</p>
                            {event.links && (
                              <p className="mb-1"><strong>Links:</strong> {event.links}</p>
                            )}
                            {event.location && (
                              <p className="mb-1"><strong>Location:</strong> {event.location}</p>
                            )}
                            <p className="text-muted small">
                              <strong>Date:</strong> {new Date(event.date).toLocaleDateString()} at <strong>Time:</strong> {event.time}
                            </p>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Tab.Pane>
                  
                  {isAdmin && (
                    <Tab.Pane eventKey="requests">
                      {loadingRequests ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" size="sm" /> Loading join requests...
                        </div>
                      ) : joinRequests.length === 0 ? (
                        <Alert variant="info">No pending join requests</Alert>
                      ) : (
                        <ListGroup>
                          {joinRequests.map(request => (
                            <ListGroup.Item 
                              key={request._id}
                              className="join-request-item d-flex justify-content-between align-items-center flex-wrap"
                            >
                              <div>
                                <span className="fw-bold">{request.user.name}</span>
                                <span className="text-muted ms-2">({request.user.email})</span>
                                <Badge 
                                  bg={request.user.role === 'teacher' ? 'primary' : 'success'} 
                                  className="ms-2"
                                >
                                  {request.user.role}
                                </Badge>
                                <div className="small text-muted">
                                  Requested: {new Date(request.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="d-flex action-btns">
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  className="me-3"
                                  onClick={() => handleJoinRequestResponse(request.user._id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => handleJoinRequestResponse(request.user._id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Tab.Pane>
                  )}
                </Tab.Content>
              </Tab.Container>
            </Col>

            {/* Right Sidebar for desktop only */}
            <Col md={4} className="d-none d-lg-block">
              <CommunitySidePanel
                communityId={id}
                isAdmin={isAdmin}
                onDeleteCommunity={handleDeleteCommunity}
                joinCode={community.joinCode}
                joinCodeDescription="Share this code with others to let them join the community"
                onUploadMaterialClick={() => setShowUploadModal(true)}
                onCreateEventClick={() => setShowCreateEventModal(true)}
              />
            </Col>

            {/* Offcanvas sidebar for mobile */}
            <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start" className="d-lg-none">
              <Offcanvas.Header closeButton>
                <Offcanvas.Title>Menu</Offcanvas.Title>
              </Offcanvas.Header>
              <Offcanvas.Body>
                <CommunitySidePanel
                  communityId={id}
                  isAdmin={isAdmin}
                  onDeleteCommunity={handleDeleteCommunity}
                  joinCode={community.joinCode}
                  joinCodeDescription="Share this code with others to let them join the community"
                  onUploadMaterialClick={() => setShowUploadModal(true)}
                  onCreateEventClick={() => setShowCreateEventModal(true)}
                />
              </Offcanvas.Body>
            </Offcanvas>
          </Row>
          
          {/* Remove Member Modal */}
          <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Remove Member</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this community?
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleRemoveMember}
                disabled={removeLoading}
              >
                {removeLoading ? 'Removing...' : 'Remove'}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Upload Modal */}
          <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Upload Material</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleUploadMaterial}>
                <Form.Group className="mb-3">
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={uploadForm.title}
                    onChange={handleUploadChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={uploadForm.description}
                    onChange={handleUploadChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tags (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    name="tags"
                    value={uploadForm.tags}
                    onChange={handleUploadChange}
                    placeholder="e.g., lecture, notes, assignment"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>File</Form.Label>
                  <Form.Control
                    type="file"
                    name="file"
                    id="file-upload"
                    onChange={handleUploadChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Supported formats: Images, PDFs, Documents, Media files (max 10MB)
                  </Form.Text>
                </Form.Group>
                {uploadError && (
                  <Alert variant="danger" className="mt-3">
                    {uploadError}
                  </Alert>
                )}
                {uploadSuccess && (
                  <Alert variant="success" className="mt-3">
                    {uploadSuccess}
                  </Alert>
                )}
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Uploading...
                    </>
                  ) : (
                    'Upload Material'
                  )}
                </Button>
              </Form>
            </Modal.Body>
          </Modal>

          {/* Create Event Modal */}
          <Modal show={showCreateEventModal} onHide={() => setShowCreateEventModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Create New Event</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleCreateEvent}>
                <Form.Group className="mb-3">
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleEventChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={eventForm.description}
                    onChange={handleEventChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Links (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    name="links"
                    value={eventForm.links}
                    onChange={handleEventChange}
                    placeholder="e.g., Google Meet link, registration form"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={eventForm.location}
                    onChange={handleEventChange}
                    placeholder="e.g., Zoom, Auditorium A"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleEventChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Time</Form.Label>
                  <Form.Control
                    type="time"
                    name="time"
                    value={eventForm.time}
                    onChange={handleEventChange}
                    required
                  />
                </Form.Group>
                {eventError && (
                  <Alert variant="danger" className="mt-3">
                    {eventError}
                  </Alert>
                )}
                {eventSuccess && (
                  <Alert variant="success" className="mt-3">
                    {eventSuccess}
                  </Alert>
                )}
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={eventLoading}
                >
                  {eventLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </Button>
              </Form>
            </Modal.Body>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default CommunityDetails;
