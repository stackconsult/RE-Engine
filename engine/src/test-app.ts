import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-test'
  });
});

// Simple auth endpoint for testing
app.post('/auth/token', (req, res) => {
  const { serviceId } = req.body;
  const apiKey = req.headers['x-api-key'];
  
  console.log(`Auth request for service: ${serviceId}`);
  
  // Simple validation for testing
  const validKeys = {
    'reengine-engine': process.env.ENGINE_API_KEY || 'test-key',
    'reengine-browser': process.env.BROWSER_API_KEY || 'test-key',
    'reengine-tinyfish': process.env.TINYFISH_API_KEY || 'test-key',
    'reengine-llama': process.env.LLAMA_API_KEY || 'test-key',
    'reengine-core': process.env.CORE_API_KEY || 'test-key',
    'reengine-outreach': process.env.OUTREACH_API_KEY || 'test-key'
  };
  
  if (validKeys[serviceId as keyof typeof validKeys] === apiKey) {
    const token = `test-jwt-token-${Date.now()}`;
    res.json({
      token,
      expiresIn: 3600,
      service: { serviceId, permissions: { read: true, write: true } }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected endpoint
app.get('/api/protected', (req, res) => {
  res.json({
    message: 'Access granted',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test Engine API running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth/token`);
});
