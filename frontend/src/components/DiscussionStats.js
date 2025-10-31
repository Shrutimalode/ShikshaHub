import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';

const DiscussionStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <Card className="mb-3">
      <Card.Body className="py-2">
        <Row className="text-center">
          <Col>
            <div className="stat-item">
              <h6 className="mb-1 text-primary">{stats.totalComments}</h6>
              <small className="text-muted">Total Comments</small>
            </div>
          </Col>
          <Col>
            <div className="stat-item">
              <h6 className="mb-1 text-success">{stats.topLevelComments}</h6>
              <small className="text-muted">Top-level</small>
            </div>
          </Col>
          <Col>
            <div className="stat-item">
              <h6 className="mb-1 text-info">{stats.replies}</h6>
              <small className="text-muted">Replies</small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default DiscussionStats;
