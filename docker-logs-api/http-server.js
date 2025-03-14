require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const app = express();

const PORT = process.env.HTTP_PORT || 3000;
const API_KEY = process.env.API_KEY;

// Middleware to check API key
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(checkApiKey);

app.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

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
    res.write(`data: ${data}\n\n`);
  });

  dockerLogs.stderr.on('data', (data) => {
    res.write(`data: ERROR: ${data}\n\n`);
  });

  req.on('close', () => {
    dockerLogs.kill();
  });
});

app.listen(PORT, () => {
  console.log(`HTTP server is running on port ${PORT}`);
});
