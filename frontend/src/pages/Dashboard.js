import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Spinner, Alert, Badge, Nav, Offcanvas } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';


const Dashboard = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [activeTab, setActiveTab] = useState('joined');
  const [showSidebar, setShowSidebar] = useState(false); // For mobile menu

  // Fetch all communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        console.log('Fetching communities, current user:', user);
        const res = await api.get('/communities');
        
        // Fetch blogs and materials for each community
        const communitiesWithCounts = await Promise.all(
          res.data.map(async (community) => {
            try {
              const [blogsRes, materialsRes] = await Promise.all([
                api.get(`/blogs/community/${community._id}`),
                api.get(`/materials/community/${community._id}`)
              ]);
              
              return {
                ...community,
                blogs: blogsRes.data,
                materials: materialsRes.data
              };
            } catch (error) {
              console.error(`Error fetching details for community ${community._id}:`, error);
              return community;
            }
          })
        );
        
        setCommunities(communitiesWithCounts);
        
        // Separate joined and all communities
        const joined = communitiesWithCounts.filter(community => {
          // Check if user is a student in this community
          const isStudent = Array.isArray(community.students) && 
            community.students.some(student => 
              (typeof student === 'string' && (student === user?.id || student === user?._id)) ||
              (student?._id && (student._id === user?.id || student._id === user?._id))
            );
          
          // Check if user is a teacher in this community
          const isTeacher = Array.isArray(community.teachers) && 
            community.teachers.some(teacher => 
              (typeof teacher === 'string' && (teacher === user?.id || teacher === user?._id)) ||
              (teacher?._id && (teacher._id === user?.id || teacher._id === user?._id))
            );
          
          // Check if user is the admin
          const isAdmin = community.admin && 
            ((typeof community.admin === 'string' && (community.admin === user?.id || community.admin === user?._id)) ||
            (community.admin?._id && (community.admin._id === user?.id || community.admin._id === user?._id)));
          
          console.log(`Community ${community.name}: isStudent=${isStudent}, isTeacher=${isTeacher}, isAdmin=${isAdmin}`);
          return isStudent || isTeacher || isAdmin;
        });
        
        console.log('Joined communities:', joined);
        setJoinedCommunities(joined);
        setAllCommunities(communitiesWithCounts);
        setFilteredCommunities(activeTab === 'joined' ? joined : communitiesWithCounts);
      } catch (error) {
        setError('Failed to fetch communities. Please try again later.');
        console.error('Error fetching communities:', error);
      }
      setLoading(false);
    };

    fetchCommunities();
  }, [user, activeTab]);

  // Handle join community
  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }

    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const res = await api.post('/communities/join', { joinCode });
      
      // Add the newly joined community to the lists
      const newCommunity = res.data.community;
      setCommunities([...communities, newCommunity]);
      setJoinedCommunities([...joinedCommunities, newCommunity]);
      setAllCommunities([...allCommunities, newCommunity]);
      
      if (activeTab === 'joined') {
        setFilteredCommunities([...joinedCommunities, newCommunity]);
      }
      
      setJoinSuccess('Successfully joined the community!');
      setJoinCode('');
    } catch (error) {
      setJoinError(error.response?.data?.message || 'Failed to join community');
      console.error('Error joining community:', error);
    }
    
    setJoinLoading(false);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    if (tab === 'joined') {
      const filtered = searchTerm.trim() === '' 
        ? joinedCommunities 
        : joinedCommunities.filter(community => 
            community.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            community.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
      setFilteredCommunities(filtered);
    } else {
      const filtered = searchTerm.trim() === '' 
        ? allCommunities 
        : allCommunities.filter(community => 
            community.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            community.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
      setFilteredCommunities(filtered);
    }
  };

  // Handle search
  useEffect(() => {
    const communitiesToFilter = activeTab === 'joined' ? joinedCommunities : allCommunities;
    
    if (searchTerm.trim() === '') {
      setFilteredCommunities(communitiesToFilter);
    } else {
      const filtered = communitiesToFilter.filter(community => 
        community.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        community.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCommunities(filtered);
    }
  }, [searchTerm, joinedCommunities, allCommunities, activeTab]);

  // Get role badge variant
  // const getRoleBadgeVariant = (role) => {
  //   switch (role) {
  //     case 'admin':
  //       return 'danger';
  //     case 'teacher':
  //       return 'primary';
  //     case 'student':
  //       return 'success';
  //     default:
  //       return 'secondary';
  //   }
  // };

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

  return (
    <Container>
      {/* Header Row - full width, no padding on mobile */}
      <div className="dashboard-header-row position-relative" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
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
          {/* Center: Dashboard title */}
          <div className="position-absolute w-100 d-flex justify-content-center" style={{ left: 0, top: 0, height: '100%' }}>
            <h2 className="mb-0" style={{ lineHeight: '48px' }}>Dashboard</h2>
          </div>
          {/* Right: Invisible placeholder for balance */}
          <div style={{ width: '40px' }} className="d-none d-lg-block"></div>
        </div>
      </div>
      <Row className="g-3">
        {/* Main Content */}
        <Col md={8} xs={12}>
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex flex-wrap flex-md-nowrap justify-content-between align-items-center mb-3">
                    <Card.Title className="mb-0">Communities</Card.Title>
                    <InputGroup className="dashboard-search-input mt-2 mt-md-0" style={{ width: '300px' }}>
                      <Form.Control
                        placeholder="Search communities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </div>

                  <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                      <Nav.Link 
                        active={activeTab === 'joined'} 
                        onClick={() => handleTabChange('joined')}
                      >
                        My Communities
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                        active={activeTab === 'all'} 
                        onClick={() => handleTabChange('all')}
                      >
                        All Communities
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>

                  {error && <Alert variant="danger">{error}</Alert>}

                  <div className="communities-grid">
                    {filteredCommunities.map(community => (
                      <Card
                        key={community?._id || Math.random()}
                        className="mb-3 community-card-link"
                        style={{ cursor: 'pointer' }}
                        onClick={() => community?._id && window.location.assign(`/communities/${community._id}`)}
                      >
                        <Card.Body>
                          <Card.Title>{community?.name || 'No Name'}</Card.Title>
                          <Card.Text>{community?.description || 'No Description'}</Card.Text>
                          <div className="mb-2">
                            <Badge bg="secondary" className="me-2">
                              {(community?.teachers?.length || 0) + (community?.students?.length || 0) + 1} Members
                            </Badge>
                            <Badge bg="info" className="me-2">
                              {community?.blogs?.length || 0} Blogs
                            </Badge>
                            <Badge bg="primary">
                              {community?.materials?.length || 0} Materials
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
        {/* Right Sidebar for desktop only */}
        <Col md={4} xs={12} className="dashboard-side-panel d-none d-lg-block">
          <div className="d-flex flex-column gap-3">
            {user && user.role === 'admin' && (
              <Button 
                as={Link} 
                to="/communities/create" 
                variant="primary" 
                className="mb-2"
                style={{ width: '100%' }}
              >
                <i className="fas fa-plus me-2"></i> Create Community
              </Button>
            )}
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title>Join a Community</Card.Title>
                <Form onSubmit={handleJoinCommunity} className="mt-3">
                  {joinError && <Alert variant="danger">{joinError}</Alert>}
                  {joinSuccess && <Alert variant="success">{joinSuccess}</Alert>}
                  <InputGroup className="mb-3">
                    <Form.Control
                      placeholder="Enter join code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      aria-label="Join code"
                    />
                    <Button variant="primary" type="submit" disabled={joinLoading}>
                      {joinLoading ? <Spinner animation="border" size="sm" /> : 'Join'}
                    </Button>
                  </InputGroup>
                </Form>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>
      {/* Offcanvas sidebar for mobile */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start" className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {user && user.role === 'admin' && (
            <Button 
              as={Link} 
              to="/communities/create" 
              variant="primary" 
              className="mb-3 w-100"
            >
              <i className="fas fa-plus me-2"></i> Create Community
            </Button>
          )}
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Join a Community</Card.Title>
              <Form onSubmit={handleJoinCommunity} className="mt-3">
                {joinError && <Alert variant="danger">{joinError}</Alert>}
                {joinSuccess && <Alert variant="success">{joinSuccess}</Alert>}
                <InputGroup className="mb-3">
                  <Form.Control
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    aria-label="Join code"
                  />
                  <Button variant="primary" type="submit" disabled={joinLoading}>
                    {joinLoading ? <Spinner animation="border" size="sm" /> : 'Join'}
                  </Button>
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
};

export default Dashboard;
