import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Container, Nav, NavDropdown, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const AppNavbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setExpanded(false);
  };

  // Add this function to fix the ReferenceError
  const handleNavClick = () => setExpanded(false);

  const authLinks = (
    <>
      <Nav className="me-auto">
      </Nav>
      <Nav style={{ marginRight: '1rem' }}>
        <NavDropdown title={user ? (
          <span className="navbar-text" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
            Welcome, {user.name} {user.role && (
              <Badge bg={user.role === 'admin' ? 'danger' : user.role === 'teacher' ? 'primary' : 'success'} className="ms-2 text-capitalize">
                {user.role}
              </Badge>
            )}
          </span>
        ) : 'Account'} id="basic-nav-dropdown">
          <NavDropdown.Item as={Link} to="/profile" onClick={handleNavClick}>Profile</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
        </NavDropdown>
        {user && user.role === 'admin' && false && (
          <Button 
            as={Link} 
            to="/communities/create" 
            size="sm"
            style={{ 
              backgroundColor: '#4a154b',
              borderColor: '#4a154b',
              color: 'white',
              padding: '0.3rem 1rem',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              marginLeft: '1rem'
            }}
            onClick={handleNavClick}
          >
            Create Community
          </Button>
        )}
      </Nav>
    </>
  );

  const guestLinks = (
    <Nav className="ms-auto guest-auth-buttons" style={{ marginRight: '0.5rem' }}>
      <Button
        as={Link}
        to="/login"
        variant="outline-primary"
        className="me-4"
        size="sm"
        onClick={handleNavClick}
        style={{
          fontSize: '0.95rem',
          padding: '0.35rem 0.7rem',
          borderRadius: '18px',
          minWidth: '90px',
          maxWidth: '120px',
          marginRight: '0.2rem',
          boxShadow: '0 1px 4px rgba(74,21,75,0.07)',
          transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
        }}
      >
        Login
      </Button>
      <Button
        as={Link}
        to="/register"
        variant="primary"
        size="sm"
        onClick={handleNavClick}
        style={{
          fontSize: '0.95rem',
          padding: '0.35rem 0.7rem',
          borderRadius: '18px',
          minWidth: '90px',
          maxWidth: '120px',
          boxShadow: '0 1px 4px rgba(74,21,75,0.07)',
          transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
        }}
      >
        Register
      </Button>
    </Nav>
  );

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm fixed-top" expanded={expanded} onToggle={setExpanded}>
      <Container>
        <Navbar.Brand as={Link} to="/" className="text-primary" style={{ fontSize: '1.2rem' }}>
          <i className="fas fa-graduation-cap me-2"></i>
          ShikshaHub
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <i className="fas fa-ellipsis-v"></i>
        </Navbar.Toggle>
        <Navbar.Collapse id="basic-navbar-nav">
          {isAuthenticated ? (
            <>
              {authLinks}
            </>
          ) : (
            guestLinks
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
