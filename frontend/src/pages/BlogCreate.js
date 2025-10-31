import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner, Container } from 'react-bootstrap';
import api from '../api';

const BlogCreate = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/blogs', {
        title: form.title,
        content: form.content,
        tags: form.tags,
        communityId
      });
      setSuccess('Blog created successfully!');
      setTimeout(() => {
        navigate(`/communities/${communityId}`);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create blog');
    }
    setLoading(false);
  };

  return (
    <Container className="py-4">
      <Card className="mx-auto" style={{ maxWidth: 700 }}>
        <Card.Body>
          <Card.Title>Create Blog</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                name="content"
                value={form.content}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g., ML, AI, deep learning"
              />
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Create Blog'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BlogCreate; 