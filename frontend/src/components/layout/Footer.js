import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer mt-auto">
      <Container>
        <Row className="py-3">
          <Col md={6} className="text-center text-md-start">
            <h5><i className="fas fa-book-reader me-2"></i>ShikshaHub</h5>
            <p className="small">
              A centralized platform where mentors and learners can connect, 
              share resources and collaborate in communities.
            </p>
          </Col>
          <Col md={3} className="text-center text-md-start">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-light">Home</a></li>
              <li><a href="/login" className="text-light">Login</a></li>
              <li><a href="/register" className="text-light">Register</a></li>
            </ul>
          </Col>
          <Col md={3} className="text-center text-md-start">
            <h6>Contact</h6>
            <ul className="list-unstyled">
              <li><i className="fas fa-envelope me-2"></i>shikshahub112004@gmail.com</li>
          
            </ul>
          </Col>
        </Row>
        <Row>
          <Col className="text-center py-3 border-top border-secondary">
            <p className="small mb-0">
              &copy; {currentYear} ShikshaHub. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 
