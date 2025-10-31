import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';

const BlogForm = ({ blog, communityId, onSubmit, submitButtonText, isEdit }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isOriginalContent: true,
    realAuthorName: '',
    sourceUrl: '',
    tags: ''
  });
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);
  
  // Initialize form with blog data if editing
  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title || '',
        content: blog.content || '',
        isOriginalContent: blog.isOriginalContent !== undefined ? blog.isOriginalContent : true,
        realAuthorName: blog.realAuthorName || '',
        sourceUrl: blog.sourceUrl || '',
        tags: blog.tags ? blog.tags.join(', ') : ''
      });
    }
  }, [blog]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    if (!formData.isOriginalContent && !formData.realAuthorName.trim()) {
      setError('Please provide the real author name for external content');
      return;
    }
    
    setError('');
    
    onSubmit({
      ...formData,
      communityId
    });
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>{isEdit ? 'Edit Blog Post' : 'Create Blog Post'}</Card.Title>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="blogTitle">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter a title for your blog post"
            />
            <Form.Control.Feedback type="invalid">
              Please provide a title.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3" controlId="blogContent">
            <Form.Label>Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={10}
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              placeholder="Write your blog post content here..."
            />
            <Form.Control.Feedback type="invalid">
              Please provide content for your blog post.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="blogTags">
                <Form.Label>Tags (comma separated)</Form.Label>
                <Form.Control
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g. education, science, technology"
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group controlId="isOriginalContent">
                <Form.Label>Content Authorship</Form.Label>
                <div>
                  <Form.Check
                    type="checkbox"
                    label="This is my original content"
                    name="isOriginalContent"
                    checked={formData.isOriginalContent}
                    onChange={handleChange}
                    id="originalContentCheckbox"
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
          
          {!formData.isOriginalContent && (
            <>
              <Alert variant="info" className="mb-3">
                <Alert.Heading>Attribution Requirements</Alert.Heading>
                <p>
                  When sharing content created by others, it's important to provide proper attribution. 
                  Please ensure you have permission to share this content or that it is available under a license that allows sharing.
                </p>
                <hr />
                <p className="mb-0">
                  Fill in the original author's name and source URL (if available) below.
                </p>
              </Alert>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="realAuthorName">
                    <Form.Label>Original Author's Name*</Form.Label>
                    <Form.Control
                      type="text"
                      name="realAuthorName"
                      value={formData.realAuthorName}
                      onChange={handleChange}
                      required
                      placeholder="Enter the name of the original author"
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide the original author's name.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group controlId="sourceUrl">
                    <Form.Label>Source URL (Optional)</Form.Label>
                    <Form.Control
                      type="url"
                      name="sourceUrl"
                      value={formData.sourceUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/original-content"
                    />
                    <Form.Text className="text-muted">
                      If available, provide the URL where this content was originally published.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}
          
          <Button variant="primary" type="submit">
            {submitButtonText || 'Submit'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default BlogForm; 