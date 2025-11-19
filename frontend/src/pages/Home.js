import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page" style={{ width: '100vw', margin: 0, padding: 0 }}>
      {/* Hero Section */}
      <section className="hero-section hero-full-width" style={{
        marginBottom: '3rem',
        position: 'relative',
        width: '100vw',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '0',
        margin: '0 auto' /* Center the block element */
      }}>
        <div className="hero-image-container position-relative" style={{ width: '100%', margin: 0, padding: 0 }}>
          <img 
            src="/bit.jpg" 
            alt="Students collaborating in a modern learning environment" 
            style={{ 
              height: '400px', 
              objectFit: 'cover',
              filter: 'brightness(0.6)',
              width: '100%',
              margin: 0,
              padding: 0,
              display: 'block'
            }}
          />
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center" 
            style={{ 
              width: '100%',
              background: 'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4))'
            }}>
            <div className="container">
              <div className="row">
                <div className="col-md-8 text-white">
                  <h1 className="display-4 fw-bold mb-2">Welcome to ShikshaHub</h1>
                  <p className="lead mb-3">
                    A modern platform where students, teachers, and administrators can connect,
                    share resources, and collaborate in learning communities.
                  </p>
                  {isAuthenticated ? (
                    <Button as={Link} to="/dashboard" variant="light" size="lg" className="me-3">
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button as={Link} to="/register" variant="light" size="lg" className="me-3">
                        Get Started
                      </Button>
                      
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-5">
        <Container>
          <h2 className="text-center mb-5">What We Offer</h2>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="h-100 border-0">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-users fa-3x text-primary"></i>
                  </div>
                  <Card.Title>Learning Communities</Card.Title>
                  <Card.Text>
                    Create or join learning communities with secure access codes. Connect with 
                    peers and educators in your field of interest.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="h-100 border-0">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-file-alt fa-3x text-primary"></i>
                  </div>
                  <Card.Title>Resource Sharing</Card.Title>
                  <Card.Text>
                    Share and access study materials, cheat sheets, notes, and other resources
                    to enhance your learning experience.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="h-100 border-0">
                <Card.Body className="text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-search fa-3x text-primary"></i>
                  </div>
                  <Card.Title>Smart Search</Card.Title>
                  <Card.Text>
                    Find communities and resources quickly with our keyword-based search
                    functionality. Discover content relevant to your interests.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works py-5 bg-light">
        <Container>
          <h2 className="text-center mb-5">How It Works</h2>
          <Row className="text-center">
            <Col md={3} className="mb-4">
              <div className="step-circle mx-auto mb-3 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-user-plus fa-2x"></i>
              </div>
              <h5>Register</h5>
              <p>Sign up as a student, teacher, or admin.</p>
            </Col>
            <Col md={3} className="mb-4">
              <div className="step-circle mx-auto mb-3 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-plus-circle fa-2x"></i>
              </div>
              <h5>Create/Join</h5>
              <p>Create or join learning communities.</p>
            </Col>
            <Col md={3} className="mb-4">
              <div className="step-circle mx-auto mb-3 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-upload fa-2x"></i>
              </div>
              <h5>Share</h5>
              <p>Upload and share learning materials.</p>
            </Col>
            <Col md={3} className="mb-4">
              <div className="step-circle mx-auto mb-3 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-graduation-cap fa-2x"></i>
              </div>
              <h5>Learn</h5>
              <p>Access resources and enhance learning.</p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-5">
        <Container className="text-center">
          <h2 className="mb-4">Ready to get started?</h2>
          <p className="lead mb-4">Join our community today and start your learning journey</p>
          {isAuthenticated ? (
            <Button as={Link} to="/dashboard" variant="primary" size="lg">
              Go to Dashboard
            </Button>
          ) : (
            <Button as={Link} to="/register" variant="primary" size="lg">
              Create Your Account
            </Button>
          )}
        </Container>
      </section>
    </div>
  );
};

export default Home; 
