import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const CreateCommunity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Redirect if not admin
  if (user && user.role !== 'admin') {
    navigate('/dashboard');
  }

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
      const { name, description } = formData;
      
      // Validation
      if (!name.trim() || !description.trim()) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Create community
      const res = await api.post('/communities', formData);
      
      // Redirect to the new community
      navigate(`/communities/${res.data._id}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create community');
      console.error('Error creating community:', error);
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2 className="mb-4">Create New Learning Community</h2>
      
      <Card className="shadow-sm">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Community Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter community name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                placeholder="Describe what this community is about"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="me-2"
              disabled={loading}
            >
              {loading ? (
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
              ) : 'Create Community'}
            </Button>
            
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateCommunity; 