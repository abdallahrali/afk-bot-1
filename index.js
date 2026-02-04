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

// Bot Setup
function createBot() {
    const bot = mineflayer.createBot(config.botArgs);

    bot.once('spawn', () => {
        console.log('--- Bot Joined Server ---');
        try { mineflayerViewer(bot, { port: config.viewerPort, firstPerson: true }) } catch (e) {}

        // Start Background Tasks
        botLogic.startAfkRoutine(bot);
        botLogic.startDataStream(io, bot);

        // Initialize Socket Handlers
        io.removeAllListeners(); // Prevent duplicates on reconnect
        socketHandler(io, bot);
    });

    bot.on('end', () => {
        console.log('Disconnected. Reconnecting in 10s...');
        setTimeout(createBot, 10000);
    });
    
    bot.on('error', (err) => console.log('Error:', err.message));
}

createBot();