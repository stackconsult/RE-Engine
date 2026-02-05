// Authentication wrapper with graceful fallback
const SERVICE_CONFIG = {
  serviceId: process.env.SERVICE_ID || 'reengine-tinyfish',
  apiKey: process.env.TINYFISH_API_KEY || process.env.DEFAULT_API_KEY || 'dev-key-placeholder',
  authUrl: process.env.AUTH_URL || 'http://localhost:3001/auth/token',
  requireAuth: process.env.NODE_ENV === 'production'
};

async function getServiceToken(): Promise<string | null> {
  if (!SERVICE_CONFIG.requireAuth) {
    console.log('🔓 Development mode: Skipping JWT authentication');
    return null;
  }
  
  try {
    const response = await fetch(SERVICE_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERVICE_CONFIG.apiKey
      },
      body: JSON.stringify({ serviceId: SERVICE_CONFIG.serviceId })
    });

    if (!response.ok) {
      console.warn(`⚠️  Auth failed (${response.status}), continuing without token`);
      return null;
    }

    const { token } = await response.json();
    console.log('✅ JWT token obtained successfully');
    return token;
  } catch (error) {
    console.warn('⚠️  Auth service unavailable, continuing without token:', (error as Error).message);
    return null;
  }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getServiceToken();
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
