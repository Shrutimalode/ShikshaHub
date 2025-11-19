import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Container, Row, Col, Spinner, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordResult, setForgotPasswordResult] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { email, password } = formData;
      
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      const result = await login(formData);
      
      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }
      
      navigate('/dashboard');
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    }
    
    setLoading(false);
  };

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="mb-3">Welcome back!</h2>
                <p className="text-muted">Login to access your account</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <div style={{ position: 'relative' }}>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <span
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      role="button"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                <div className="text-center">
                  <Button variant="link" onClick={() => setShowForgotPassword(true)} style={{padding:0}}>Forgot Password?</Button>
                </div>
                <div className="text-center mt-3">
                  <p>
                    Don't have an account? <Link to="/register">Register</Link>
                  </p>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Modal show={showForgotPassword} onHide={() => setShowForgotPassword(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Forgot Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={async e => {
            e.preventDefault();
            setForgotPasswordResult('');
            setForgotPasswordLoading(true);
            try {
              const res = await api.post('/auth/forgot-password', { email: forgotPasswordEmail });
              setForgotPasswordResult(res.data.message || 'If your email is registered, a reset link has been sent.');
            } catch (err) {
              setForgotPasswordResult(err.response?.data?.message || 'Error sending reset email');
            }
            setForgotPasswordLoading(false);
          }}>
            <Form.Group className="mb-3" controlId="forgotPasswordEmail">
              <Form.Label>Enter your registered email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                onChange={e => setForgotPasswordEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={forgotPasswordLoading} className="w-100">
              {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            {forgotPasswordResult && <Alert variant="info" className="mt-3">{forgotPasswordResult}</Alert>}
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Login; 