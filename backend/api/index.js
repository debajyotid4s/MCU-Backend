/**
 * Root/Health Check Endpoint
 * 
 * GET /
 * Returns API status information
 */

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    name: 'ESP32 Voice Assistant API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      query: 'POST /api/query',
      response: 'GET /api/response?request_id=xxx',
      delete: 'DELETE /api/response?request_id=xxx'
    },
    timestamp: new Date().toISOString()
  });
}
