import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, ListGroup, Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const Profile = () => {
  const { user } = useAuth();
  const [emailPrefs, setEmailPrefs] = useState(user?.emailPreferences || {
    materialUpload: true,
    blogUpload: true,
    blogReview: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [expertise, setExpertise] = useState(user?.expertise || []);
  const [newExpertise, setNewExpertise] = useState('');
  const [savingExpertise, setSavingExpertise] = useState(false);
  const [moderatorThreads, setModeratorThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  useEffect(() => {
    // Load moderator threads if user is a teacher
    if (user?.role === 'teacher') {
      loadModeratorThreads();
    }
  }, [user]);

  const loadModeratorThreads = async () => {
    setLoadingThreads(true);
    try {
      const response = await api.get('/global-forum/user/moderator-threads');
      setModeratorThreads(response.data);
    } catch (err) {
      console.error('Failed to load moderator threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const handleEmailPrefChange = (key) => {
    setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveEmailPrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.put('/auth/email-preferences', { emailPreferences: emailPrefs });
      alert('Email preferences saved successfully!');
    } catch (err) {
      alert('Failed to save preferences');
    }
    setSavingPrefs(false);
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const removeExpertise = (item) => {
    setExpertise(expertise.filter(e => e !== item));
  };

  const saveExpertise = async () => {
    setSavingExpertise(true);
    try {
      const response = await api.put('/global-forum/user/expertise', { expertise });
      alert('Expertise updated successfully!');
      console.log('Updated user:', response.data);
    } catch (err) {
      console.error('Save expertise error:', err);
      alert('Failed to update expertise: ' + (err.response?.data?.message || err.message));
    }
    setSavingExpertise(false);
  };

  // Function to get role badge
  const getRoleBadge = (role) => {
    let variant = 'secondary';
    
    switch (role) {
      case 'admin':
        variant = 'danger';
        break;
      case 'teacher':
        variant = 'primary';
        break;
      case 'student':
        variant = 'success';
        break;
      default:
        variant = 'secondary';
    }
    
    return (
      <Badge bg={variant} className="px-3 py-2">
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <Container>
      <h2 className="mb-4">My Profile</h2>
      
      <Row>
        <Col lg={4} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4a154b&color=fff&size=128`}
                  alt={user?.name}
                  className="rounded-circle img-thumbnail"
                  width="120"
                />
              </div>
              
              <h4>{user?.name}</h4>
              <p className="text-muted">{user?.email}</p>
              
              <div className="mt-3">
                {user && getRoleBadge(user.role)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>My Communities</Card.Title>
              
              {user?.communities && user.communities.length > 0 ? (
                <ListGroup>
                  {user.communities.map(community => (
                    <ListGroup.Item 
                      key={community._id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>{community.name}</div>
                      <Button 
                        as={Link}
                        to={`/communities/${community._id}`}
                        variant="outline-primary"
                        size="sm"
                      >
                        View
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">
                  You haven't joined any communities yet.
                </p>
              )}
              
              <div className="mt-3">
                <Button as={Link} to="/dashboard" variant="primary">
                  Browse Communities
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Email Notification Preferences</Card.Title>
              <Form>
                <Form.Check
                  type="switch"
                  id="material-upload-switch"
                  label="Material Upload Notifications"
                  checked={emailPrefs.materialUpload}
                  onChange={() => handleEmailPrefChange('materialUpload')}
                />
                <Form.Check
                  type="switch"
                  id="blog-upload-switch"
                  label="Blog Upload Notifications"
                  checked={emailPrefs.blogUpload}
                  onChange={() => handleEmailPrefChange('blogUpload')}
                />
                <Form.Check
                  type="switch"
                  id="blog-review-switch"
                  label="Blog Approved/Rejected Notifications"
                  checked={emailPrefs.blogReview}
                  onChange={() => handleEmailPrefChange('blogReview')}
                />
                <Button
                  variant="primary"
                  className="mt-2"
                  onClick={saveEmailPrefs}
                  disabled={savingPrefs}
                >
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Expertise Section - Only for Teachers */}
          {user?.role === 'teacher' && (
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title>My Expertise</Card.Title>
                <p className="text-muted small">Add your areas of expertise to help admins assign you as a moderator in relevant groups.</p>
                
                <Form.Group className="mb-3">
                  <div className="d-flex gap-2">
                    <Form.Control 
                      type="text"
                      placeholder="Add expertise (e.g., Mathematics, Physics)"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                    />
                    <Button variant="outline-primary" onClick={addExpertise}>
                      Add
                    </Button>
                  </div>
                </Form.Group>

                {expertise.length > 0 && (
                  <div className="mb-3">
                    {expertise.map((item, idx) => (
                      <Badge key={idx} bg="primary" className="me-2 mb-2" style={{ fontSize: '0.9rem', padding: '8px 12px' }}>
                        {item}
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-white p-0 ms-2"
                          onClick={() => removeExpertise(item)}
                          style={{ textDecoration: 'none' }}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={saveExpertise}
                  disabled={savingExpertise}
                >
                  {savingExpertise ? 'Saving...' : 'Save Expertise'}
                </Button>
              </Card.Body>
            </Card>
          )}

          {/* Moderator Threads Section - Only for Teachers */}
          {user?.role === 'teacher' && (
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title>My Moderator Threads</Card.Title>
                <p className="text-muted small">Groups where you are assigned as a moderator.</p>
                
                {loadingThreads ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <p className="mt-2 text-muted">Loading threads...</p>
                  </div>
                ) : moderatorThreads.length > 0 ? (
                  <ListGroup>
                    {moderatorThreads.map(thread => (
                      <ListGroup.Item 
                        key={thread._id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div className="flex-grow-1">
                          <strong>{thread.title}</strong>
                          <p className="mb-0 small text-muted">{thread.description.substring(0, 80)}...</p>
                          <div className="mt-1">
                            <Badge bg="info" className="me-1" style={{ fontSize: '0.75rem' }}>
                              {thread.moderators.length} Moderator{thread.moderators.length !== 1 ? 's' : ''}
                            </Badge>
                            <small className="text-muted">Created by {thread.createdBy.name}</small>
                          </div>
                        </div>
                        <Button 
                          as={Link}
                          to={`/dashboard?tab=global-forum&threadId=${thread._id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          View
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <p className="text-muted">
                    You are not assigned as a moderator in any threads yet.
                  </p>
                )}
              </Card.Body>
            </Card>
          )}

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Account Information</Card.Title>
              
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Name:</strong> {user?.name}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Email:</strong> {user?.email}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Role:</strong> {user?.role}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Joined:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 