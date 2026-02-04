const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import Modules
const config = require('./config');
const botLogic = require('./lib/botLogic');
const socketHandler = require('./lib/socketHandler');

// Server Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/chat-page', (req, res) => res.sendFile(__dirname + '/public/chat.html'));
app.get('/gps-page', (req, res) => res.sendFile(__dirname + '/public/gps.html'));
app.get('/controls-page', (req, res) => res.sendFile(__dirname + '/public/controls.html'));
app.get('/viewer-page', (req, res) => res.sendFile(__dirname + '/public/viewer.html'));

server.listen(config.webPort, () => {
    console.log(`Dashboard active at http://localhost:${config.webPort}`);
});

function onBotSpawn() {
    console.log('--- Bot Joined Server ---');
    try { mineflayerViewer(bot, { port: config.viewerPort, firstPerson: true }) } catch (e) {}
    
    botLogic.startAfkRoutine(bot);
    botLogic.startDataStream(io, bot);
    
    io.removeAllListeners();
    socketHandler(io, bot);
}

function onBotEnd() {
    console.log('Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
}

function onError(err) {
    console.log('Error:', err.message);
}

function createBot() {
    bot = mineflayer.createBot(config.botArgs); // Make sure 'bot' is global or accessible

    // Look how clean this part is now!
    bot.once('spawn', onBotSpawn);
    bot.on('end', onBotEnd);
    bot.on('error', onError);
}

createBot();