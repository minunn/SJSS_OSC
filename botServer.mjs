// Import necessary modules
import http from 'http';
import fs from 'fs';
import fetch from 'node-fetch';
import { Client } from 'node-osc';

// Read configuration from config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const data = fs.readFileSync('avtrblacklist.json', 'utf-8');
const blacklist = JSON.parse(data).blacklisted_avatars; // Adjusted to match the JSON structure
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

// async function checkLogEntry(logEntry) {
//   if (logEntry.startsWith('avtr_')) {
//       const parts = logEntry.split(' ');
//       if (parts.length < 2) {
//           console.error(`Invalid log entry: ${logEntry}`);
//           return;
//       }

//       const avtr_id = parts[0]; // Extract avtr_id with prefix
//       const user_id = parts[1]; // Extract user_id with prefix
//       const diplay_name = parts[2]; // Extract display_name with prefix
//       const author_name = parts[3]; // Extract author_name with prefix
//       const avatar_name = parts[4]; // Extract avatar_name with prefix

//       console.log(`Checking avatar ID ${avtr_id} against blacklist...`);

//       if (blacklist.includes(avtr_id)) {
//           console.log(`Avatar ID ${avtr_id} is in the blacklist. Banning user ${user_id}...`);
//           // sendSimpleMessageToDiscord(`User ${user_id} has been detected for using avatar ${avtr_id} and it is an avatar crash !`, config.webhookURLs.otherlogs);

//              // Send the message to each webhook
//              for (let webhookURL2 of [config.webhookURLs.otherlogs, config.webhookURLs.ovovrcrash, config.webhookURLs.crazyfamillycrash,config.webhookURLs.furniacrash]) {
              
//                   sendSimpleMessageToDiscord(`❌userid: ${user_id} has been detected for using avatar crash here is the ID : ${avtr_id}  displayname: ${diplay_name}  authorname: ${author_name}   avatarname: ${avatar_name}  ❌`, webhookURL2);
//                   if(config.sentCrashToVRChat) {
//                     sendLogsToVRChatOSC(`❌userid: ${user_id} has been detected for using avatar crash ❌`);
//                   }
                  
//                 }

//               } else {
//                 console.log(`Avatar ID ${avtr_id} is not in the blacklist.`);
//             }
      

//           // banGroupMember('grp_9575f80e-9398-4c04-8704-a97f5b22e61d', user_id); // Replace with your group ID
//       }
//   }



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
    // checkLogEntry(logEntry); // Check each log entry
    if (!logEntry.includes('[INFO]') && !logEntry.includes('[COMMAND]') && !logEntry.includes('[ERROR]')) {
      logCounts[logEntry] = (logCounts[logEntry] || 0) + 1;
      lastLogTime = Date.now();
      console.log('Log entry:', logEntry);
     //send message to the other logs if contains the word 🚫 and the message blacklisted avatar
     if (logEntry.includes('blacklisted') && logEntry.includes('🚫') && config.sentCrashToVRChat) {
      oscClient = new Client(config.vrchatOSCHost, config.vrchatOSCPort);
// Extract the part of logEntry removing the part after "which is blacklisted"
const endIndex = logEntry.indexOf('which is blacklisted') + 'which is blacklisted'.length;
const truncatedLogEntry = logEntry.substring(0, endIndex).trim();
console.log('Truncated Log Entry:', truncatedLogEntry);

oscClient.send('/chatbox/input', truncatedLogEntry, true, (error) => {
  if (error) {
    console.error('Error sending OSC message:', error);
    reject(error);
  } else {
    console.log('OSC message sent:', truncatedLogEntry);
  }
});
      for (let webhookURL2 of [config.webhookURLs.otherlogs]) {
// Get current date
let date = new Date();

// Convert to local time
let time = date.toLocaleTimeString();

        await sendSimpleMessageToDiscord(`<@&1224426816614436954>` +` [${time}] `+ logEntry, webhookURL2);
      }
   
    }
    if (logEntry.includes('blacklisted') && logEntry.includes('🚫')) {

    for (let webhookURL2 of [config.webhookURLs.otherlogs]) {
      // Get current date
      let date = new Date();
      
      // Convert to local time
      let time = date.toLocaleTimeString();
      
              await sendSimpleMessageToDiscord(`<@&1224426816614436954> ` +` [${time}] `+ logEntry, webhookURL2);
            }
          }
         //send message to the other logs if contains the word 🚫 and the message "has timed out after"
          if (logEntry.includes('has timed out after') && config.sentCrashToVRChat) {
            oscClient = new Client(config.vrchatOSCHost, config.vrchatOSCPort);
      // Extract the part of logEntry removing the part "seconds"
      const truncatedLogEntry = logEntry.replace(' seconds', '');
            console.log('Truncated Log Entry:', truncatedLogEntry);

            oscClient.send('/chatbox/input', truncatedLogEntry, true, (error) => {
              if (error) {
                console.error('Error sending OSC message:', error);
                reject(error);
              } else {
                console.log('OSC message sent:', truncatedLogEntry);
              }
            }
            );
            for (let webhookURL2 of [config.webhookURLs.timedoutlogs]) {
// Get current date
let date = new Date();

// Convert to local time
let time = date.toLocaleTimeString();

              // await sendSimpleMessageToDiscord(`[${time}] `+logEntry, webhookURL2);
              await sendSimpleMessageToDiscord(logEntry, webhookURL2);

            }
          }
          if (logEntry.includes('has timed out after')) {

            for (let webhookURL2 of [config.webhookURLs.timedoutlogs]) {
              // Get current date
              let date = new Date();
              
              // Convert to local time
              let time = date.toLocaleTimeString();
              
                      // await sendSimpleMessageToDiscord(` [${time}] `+ logEntry, webhookURL2);
                      await sendSimpleMessageToDiscord( logEntry, webhookURL2);

                    }
                  }

      //do not send if entry contain "INFO :"
      if (config.sendToVRChat && !logEntry.includes('INFO :')) {
         await sendLogsToVRChatOSC(logEntry);
      }
    }
  } 

  isProcessingLogs = false;
}

let isSendingMessage = false;

// Send grouped logs to Discord every second
setInterval(async () => {
  // If there are logs in the batch and no new logs have been added in the last 3 seconds
  if (!isSendingMessage && Object.keys(logCounts).length > 0 && Date.now() - lastLogTime >= 3000) {
    isSendingMessage = true;
    if (config.sendToDiscord) {
      let message = '';
      for (let log in logCounts) {
        message += log + (logCounts[log] > 1 ? ' **[x' + logCounts[log] + "]**" : '') + '\n';
      }
      // Send the message to each webhook
      for (let webhookURL of [config.webhookURLs.smalllogs]) {
// Get current date
let date = new Date();

// Convert to local time
let time = date.toLocaleTimeString();

        // await sendSimpleMessageToDiscord(`[${time}] `+message, webhookURL);
        await sendSimpleMessageToDiscord(message, webhookURL);

      }

    }
    // Reset the log counts
    logCounts = {};
    isSendingMessage = false;
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

// async function banGroupMember(groupId, userId) {
//   const url = `https://api.vrchat.cloud/api/1/groups/${groupId}/members/${userId}`;
//   const options = {
//       method: 'POST',
//       headers: {
//           'Content-Type': 'application/json',
//           'Cookie': 'auth_cookie=' + config.authCookie // Assuming you have the auth cookie in your config
//       },
//       body: JSON.stringify({ userId })
//   };

//   const response = await fetch(url, options);
//   const data = await response.json();

//   if (response.ok) {
//       console.log(`User ${userId} has been banned from group ${groupId}.`);
//   } else {
//       console.error(`Failed to ban user ${userId} from group ${groupId}: ${data.error.message}`);
//   }
// }

// Send log entry to VRChat via OSC
function sendLogsToVRChatOSC(logEntry) {
  if (!config.sendToVRChat) {
    return;
  }
  if (!config.sentCrashToVRChat) {
    return;
  }

  if (!oscClient) {
    oscClient = new Client(config.vrchatOSCHost, config.vrchatOSCPort);
  }


  // Add a delay before sending logs to VRChat
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      oscClient.send('/chatbox/input', logEntry, true, (error) => {
        if (error) {
          console.error('Error sending OSC message:', error);
          reject(error);
        } else {
          console.log('OSC message sent:', logEntry);
          resolve();
        }
      });
    }, 300); // Delay of 1000 milliseconds (1 second)
  });
}

process.on('SIGINT', async () => {
  console.log('Server is going offline...');

  // Send a message to all webhook URLs
  const message = '🔴 Bot is going offline! 🔴';

  for (let webhookURL2 of [
      config.webhookURLs.smalllogs,]) {
    await sendSimpleMessageToDiscord(message, webhookURL2);
  }

  process.exit();
});

// Define server port and start listening
server.listen(config.serverPort, async () => {
  console.log(`Server running on port ${config.serverPort}`);

    // Send a message to all webhook URLs
    const message = '🟢 Bot is now online 🟢';
    // const message = '🔴🔴 JE FAIT UNE MAINTENANCE POUR DES SOUCIS DOPTIMISATION SUR LES LOGS ILS SERONTS DE RETOURS SOON !!🔴🔴';

    // const message = `Coucou tout le monde je prend une pause de vrchat j'ai encore été ban les développeurs veulent mes fesses! Les bots seronts de retours quand les devs de vrchat seronts calmé bisous et GL avec les hendicapés mentaux de crasher de vrchat!`
  
    for (let webhookURL2 of [
        config.webhookURLs.smalllogs]) {
      await sendSimpleMessageToDiscord(message, webhookURL2);
    }

});