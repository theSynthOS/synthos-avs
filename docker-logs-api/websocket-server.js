require('dotenv').config();
const WebSocket = require('ws');
const { spawn } = require('child_process');

const PORT = process.env.WS_PORT || 8080;
const API_KEY = process.env.API_KEY;

const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server is running on port ${PORT}`);

wss.on('connection', (ws, req) => {
  // Basic API key authentication
  const urlParams = new URL(req.url, 'ws://localhost').searchParams;
  const clientApiKey = urlParams.get('apiKey');
  
  if (clientApiKey !== API_KEY) {
    ws.close(1008, 'Invalid API key');
    return;
  }

  console.log('Client connected');

  const dockerLogs = spawn('docker', [
    'compose',
    'logs',
    '-f',
    '--no-log-prefix',
    '--timestamps',
    'attester-1',
    'attester-2',
    'attester-3',
    'aggregator',
    'execution-service',
    'validation-service'
  ]);

  dockerLogs.stdout.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data.toString());
    }
  });

  dockerLogs.stderr.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`ERROR: ${data.toString()}`);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    dockerLogs.kill();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    dockerLogs.kill();
  });
});
