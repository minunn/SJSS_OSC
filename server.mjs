import http from 'http';
import fs from 'fs';
import fetch from 'node-fetch';
import { info, log } from 'console';
import { Client } from 'node-osc';

const logFile = 'log.txt';
const webhookURLs = {
  join: '',
  leave: '',
  avatarChange: '',
  block: '',
  Alllogs: '',
  smalllogs: '',
  someoneCrashed: '',
};
const vrchatOSCHost = 'localhost';
const vrchatOSCPort = 9000;

const logQueue = [];
let isProcessingLogs = false; // Flag to track if logs are being processed
let oscClient = null; // OSC client instance ChatBoxMessage addEntryPhotonEvent

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let logData = '';

    req.on('data', (chunk) => {
      logData += chunk;
    });

    req.on('end', () => {
      logQueue.push(logData);

      if (!isProcessingLogs) {
        processLogs(); // Start processing logs if not already in progress
      }

      res.statusCode = 200;
      res.end('OK');
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.setMaxListeners(0);

async function processLogs() {
  if (isProcessingLogs) {
    return; // Return if logs are already being processed
  }
  isProcessingLogs = true;
  while (logQueue.length > 0) {
    const logEntry = logQueue.shift();
    //check if logs doesn't contain [INFO] and send it to smalllogs
    if (!logEntry.includes('[INFO]') && !logEntry.includes('[COMMAND]') && !logEntry.includes('[ERROR]')) {
    await sendSimpleMessageToDiscord(logEntry, webhookURLs.smalllogs);//SEND THE LOGS TO DISCORD
     await sendLogsToVRChatOSC(logEntry);//SEND THE LOGS TO VRCHAT
    }
    if (logEntry.includes('[INFO]')) {
      try {
        await sendEmbedToDiscord(logEntry, webhookURLs.Alllogs);//SEND THE LOGS TO DISCORD
        await writeLogToFile(logEntry); // Write the log entry to a file as well
        if (logEntry.includes('has joined on')) {
          await sendEmbedToDiscord(logEntry, webhookURLs.join);//SEND THE LOGS TO DISCORD
        } else if (logEntry.includes('has left')) {
          await sendEmbedToDiscord(logEntry, webhookURLs.leave);//SEND THE LOGS TO DISCORD
        } else if (logEntry.includes('has changed their avatar to')) {
          await sendEmbedToDiscord(logEntry, webhookURLs.avatarChange);//SEND THE LOGS TO DISCORD
        } else if (logEntry.includes('Blocked')) {
          await sendEmbedToDiscord(logEntry, webhookURLs.block);//SEND THE LOGS TO DISCORD
        } else if (logEntry.includes('has timed out after')) {
          await sendEmbedToDiscord(logEntry, webhookURLs.someoneCrashed);
          await sendLogsToVRChatOSC(logEntry);//SEND THE LOGS TO VRCHAT
        }
      } catch (error) {
        console.error('Error sending log entry:', error);
      }
    } else {
      try {
        await writeLogToFile(logEntry);
      } catch (error) {
        console.error('Error writing log entry to file:', error);
      }
    }
  } 
  isProcessingLogs = false;
}


function writeLogToFile(logEntry) {
  return new Promise((resolve, reject) => {
    fs.writeFile(logFile, logEntry + '\n', { flag: 'a' }, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Log entry saved:', logEntry);
        resolve();
      }
    });
  });
}

async function sendSimpleMessageToDiscord(message, webhookURL) {
  const body = JSON.stringify({ content: message });

  await fetch(webhookURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

function sendLogsToVRChatOSC(logEntry) {
  if (!oscClient) {
    oscClient = new Client(vrchatOSCHost, vrchatOSCPort);
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

  return new Promise((resolve, reject) => {
    oscClient.send('/chatbox/input', logEntry, true, (error) => {
      if (error) {
        console.error('Error sending OSC message:', error);
        reject(error);
      } else {
        console.log('OSC message sent:', oscMessage);
        resolve();
      }
    });
  });
}


async function sendEmbedToDiscord(logEntry, webhookURL) {
  const embed = {
    color: 0x00ff00, // You can customize the color
    timestamp: new Date()
  };

  const infoMatches = logEntry.match(/\[INFO\] ([^\n]+)/);
  const thumbjoinMatch = logEntry.match(/THUMBNAIL: (https:\/\/[^ ]+)/);
  const thumbMatch = logEntry.match(/THUMB: (https:\/\/[^ ]+)/);
  const imageMatch = logEntry.match(/IMAGE: (https:\/\/[^ ]+)/);
  const downloadMatch = logEntry.match(/DOWNLOAD: (https:\/\/[^ ]+)/);

  if (infoMatches && infoMatches[1]) {
    embed.description = infoMatches[1];
  }

  if (logEntry.includes('has joined on')) {
    const userJoinedMatch = logEntry.match(/([^ ]+) has joined/);
    const avatarMatch = logEntry.match(/avatar ([^by ]+) /);

    if (userJoinedMatch && userJoinedMatch[1]) {
      embed.title = `${userJoinedMatch[1]} has joined`;
    }

    if (avatarMatch && avatarMatch[1]) {
      embed.fields = [{ name: 'Avatar', value: avatarMatch[1], inline: true }];
    }

    if (thumbjoinMatch && thumbjoinMatch[1]) {
      embed.image = { url: thumbjoinMatch[1] }; // Show the thumbnail as a large image
    }
  }

  const payload = {
    embeds: [embed]
  };

  await fetch(webhookURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
