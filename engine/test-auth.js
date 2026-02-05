const jwt = require('jsonwebtoken');

// Test JWT generation
const testToken = jwt.sign(
  { serviceId: 'test', permissions: ['read'] },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);

console.log('✅ JWT Test:', testToken);

// Test validation
try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'test-secret');
  console.log('✅ JWT Validation:', decoded);
} catch (error) {
  console.log('❌ JWT Validation failed:', error.message);
}
