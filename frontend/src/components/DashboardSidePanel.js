import React from 'react';
import { Card, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';


const DashboardSidePanel = ({ joinCode, setJoinCode, joinLoading, joinError, joinSuccess, handleJoinCommunity }) => {
  return (
    <>
      {/* Join a Community Card */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Join a Community</Card.Title>
          <Card.Text>Enter the community join code to become a member</Card.Text>
          {joinError && <Alert variant="danger">{joinError}</Alert>}
          {joinSuccess && <Alert variant="success">{joinSuccess}</Alert>}
          <Form onSubmit={handleJoinCommunity}>
            <InputGroup className="mb-3">
              <Form.Control
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled={joinLoading}
              />
              <Button 
                variant="primary" 
                type="submit"
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    <span className="ms-2">Joining...</span>
                  </>
                ) : 'Join'}
              </Button>
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
};

export default DashboardSidePanel; 