// Import necessary modules
import http from 'http';
import fs from 'fs';
import fetch from 'node-fetch';
import { Client } from 'node-osc';

// Read configuration from config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Initialize log queue and processing flag
const logQueue = [];
let isProcessingLogs = false; 
let oscClient = null;
let logInterval = null;


// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle POST requests to /log
  if (req.method === 'POST' && req.url === '/log') {
    let logData = '';

    // Collect data from request
    req.on('data', (chunk) => {
      logData += chunk;
    });

    // When request ends, add data to log queue and process logs
    req.on('end', () => {
      logQueue.push(logData);

      if (!isProcessingLogs) {
        processLogs(); 
      }

      res.statusCode = 200;
      res.end('OK');
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

// Remove listener limit
server.setMaxListeners(0);

let groupedLogEntry = '';
let logCount = 0;
let logBatch = [];
let lastLogTime = Date.now();
let logCounts = {};

// Process logs in the queue
async function processLogs() {
  if (isProcessingLogs) {
    return; 
  }
  isProcessingLogs = true;

  while (logQueue.length > 0) {
    const logEntry = logQueue.shift();
    if (!logEntry.includes('[INFO]') && !logEntry.includes('[COMMAND]') && !logEntry.includes('[ERROR]')) {
      logCounts[logEntry] = (logCounts[logEntry] || 0) + 1;
      lastLogTime = Date.now();

      if (config.sendToVRChat) {
        await sendLogsToVRChatOSC(logEntry);
      }
    }
  } 

  isProcessingLogs = false;
}

// Send grouped logs to Discord every second
setInterval(async () => {
  // If there are logs in the batch and no new logs have been added in the last 3 seconds
  if (Object.keys(logCounts).length > 0 && Date.now() - lastLogTime >= 3000) {
    if (config.sendToDiscord) {
      let message = '';
      for (let log in logCounts) {
        message += log + (logCounts[log] > 1 ? ' **[x' + logCounts[log] + "]**" : '') + '\n';
      }
      await sendSimpleMessageToDiscord(message, config.webhookURLs.smalllogs);
    }
    // Reset the log counts
    logCounts = {};
  }
}, 1000);

// Write log entry to file
function writeLogToFile(logEntry) {
  return new Promise((resolve, reject) => {
    fs.writeFile(config.logFile, logEntry + '\n', { flag: 'a' }, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Log entry saved:', logEntry);
        resolve();
      }
    });
  });
}

// Send message to Discord via webhook
async function sendSimpleMessageToDiscord(message, webhookURL) {
  if (!config.sendToDiscord) {
    return;
  }

  const body = JSON.stringify({ content: message });

  await fetch(webhookURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

// Send log entry to VRChat via OSC
function sendLogsToVRChatOSC(logEntry) {
  if (!config.sendToVRChat) {
    return;
  }

  if (!oscClient) {
    oscClient = new Client(config.vrchatOSCHost, config.vrchatOSCPort);
  }

  const oscMessage = {
    address: '/chatbox/input',
    args: [
      {
        type: 's',
        value: logEntry
      }
    ]
  };

  // Add a delay before sending logs to VRChat
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      oscClient.send('/chatbox/input', logEntry, true, (error) => {
        if (error) {
          console.error('Error sending OSC message:', error);
          reject(error);
        } else {
          console.log('OSC message sent:', oscMessage);
          resolve();
        }
      });
    }, 1000); // Delay of 1000 milliseconds (1 second)
  });
}

// Define server port and start listening
server.listen(config.serverPort, () => {
  console.log(`Server running on port ${config.serverPort}`);
});