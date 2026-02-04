const mineflayer = require('mineflayer')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')

const botArgs = {
  host: 'Shellat-El-CPP.aternos.me',
  port: 50718,
  username: 'AFK_Bot_1',
  version: '1.21.9' 
}

// --- 1. Event Handler Functions ---

function onSpawn(bot) {
  console.log('--- AFK_Bot_1 is Online! ---')
  // console.log('View the bot at: http://localhost:3007')
  
  // mineflayerViewer(bot, { port: 3007, firstPerson: true })

  startAfkRoutine(bot)
  startAutoFeed(bot) // Call the new feed function
}

function startAfkRoutine(bot) {
  setInterval(() => {
    if (bot.entity) {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 500)
    }
  }, 20000)
}

// NEW: Simple function to run /feed every 5 minutes
function startAutoFeed(bot) {
  setInterval(() => {
    if (bot.entity) {
      bot.chat('/feed')
      console.log('Sent /feed command to server.')
    }
  }, 300000) // 300,000ms = 5 minutes
}

function onChat(bot, username, message) {
  if (username === bot.username) return
  if (message === '!status') {
    bot.chat('I am active and using /feed to stay full!')
  }
}

function onEnd() {
  console.log('Disconnected! Reconnecting in 10 seconds...')
  setTimeout(createBot, 10000)
}

function onError(err) {
  console.log('Error encountered: ', err.message)
}

// --- 2. Main Bot Creation Function ---

function createBot() {
  const bot = mineflayer.createBot(botArgs)

  // Register Event Listeners
  bot.once('spawn', () => onSpawn(bot))
  bot.on('chat', (username, message) => onChat(bot, username, message))
  bot.on('end', onEnd)
  bot.on('error', onError)
}

// Start the bot
createBot()