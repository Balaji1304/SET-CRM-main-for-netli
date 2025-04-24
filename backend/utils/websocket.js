const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
let wss;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws, req) => {
    // Verify JWT token from query parameter
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Authentication failed');
      return;
    }

    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      ws.userId = decoded.id;
      ws.isAlive = true;
      
      // Send connection confirmation
      ws.send(JSON.stringify({ type: 'CONNECTED' }));
      
      // Handle pong messages to keep connection alive
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    } catch (err) {
      console.error('WebSocket auth error:', err);
      ws.close(1008, 'Invalid token');
      return;
    }
  });
  
  // Implement heartbeat to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
};

const notifyClient = (userId, quotationId, status) => {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'QUOTATION_STATUS',
        quotationId,
        status
      }));
    }
  });
};

module.exports = { initWebSocket, notifyClient }; 