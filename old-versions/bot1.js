const mineflayer = require('mineflayer')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

// --- Configuration ---
const botArgs = {
  host: 'Shellat-El-CPP.aternos.me',
  port: 50718, 
  username: 'AFK_Bot_1',
  version: '1.21.1' 
}

const app = express()
const server = http.createServer(app)
const io = new Server(server)
let bot

// Store the last 50 messages so they don't disappear on refresh
const chatHistory = []

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

// 1. The Main Layout (The Parent Shell)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

// 2. The Content Pages (Loaded inside the iframe)
app.get('/chat-page', (req, res) => res.sendFile(__dirname + '/public/chat.html'))
app.get('/gps-page', (req, res) => res.sendFile(__dirname + '/public/gps.html'))
app.get('/controls-page', (req, res) => res.sendFile(__dirname + '/public/controls.html'))
app.get('/viewer-page', (req, res) => res.sendFile(__dirname + '/public/viewer.html'))

server.listen(3000, () => {
  console.log('Web Dashboard: http://localhost:3000')
})

function createBot() {
  bot = mineflayer.createBot(botArgs)

  bot.once('spawn', () => {
    try { mineflayerViewer(bot, { port: 3007, firstPerson: true }) } catch (e) {}
    startDataStream()
    startAfkRoutine()
  })

  // CHANGED: Use 'message' event to capture EVERYTHING (chats, system msgs, commands)
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString() // Convert colored JSON to plain text
    const username = "System" // Default name for server messages
    
    // Simple logic to try and extract a username if it exists
    // (This varies by server, but standard chat is usually "<User> Message")
    let user = "Server"
    if (text.startsWith('<')) {
        user = text.split('>')[0].replace('<', '')
    }

    const msgData = { user: user, text: text, isBot: (user === bot.username) }
    
    // Store in history
    chatHistory.push(msgData)
    if (chatHistory.length > 50) chatHistory.shift() // Keep only last 50

    io.emit('chatMessage', msgData)
  })

  bot.on('end', () => setTimeout(createBot, 10000))
  bot.on('error', (err) => console.log('Bot Error:', err.message))
}

// ... inside createBot() ...

// --- Socket.io Logic ---
// Global variables to track double-jumping
let lastJumpTime = 0
let isFlying = false

io.on('connection', (socket) => {
  socket.emit('history', chatHistory)

  socket.on('sendChat', (text) => {
    if (bot) bot.chat(text)
  })

  // 1. Movement Handler (With Double Jump Flight!)
  socket.on('controlState', (data) => {
    if (!bot || !bot.entity) return

    // --- DOUBLE JUMP LOGIC START ---
    if (data.action === 'jump' && data.state === true) {
      const now = Date.now()
      // If pressed again within 300ms (0.3 seconds)
      if (now - lastJumpTime < 300) {
        if (!isFlying) {
          bot.creative.startFlying()
          isFlying = true
          console.log('Flying enabled!')
        } else {
          bot.creative.stopFlying()
          isFlying = false
          console.log('Flying disabled!')
        }
      }
      lastJumpTime = now
    }
    // --- DOUBLE JUMP LOGIC END ---

    bot.setControlState(data.action, data.state)
  })

  // 2. Look Handler
  socket.on('look', (data) => {
    if (!bot || !bot.entity) return
    const newYaw = bot.entity.yaw - data.yaw
    const newPitch = bot.entity.pitch - data.pitch
    bot.look(newYaw, newPitch)
  })

  // 3. Action Handler (Upgraded)
  socket.on('action', async (type) => {
    if (!bot || !bot.entity) return

    switch (type) {
      case 'leftClick':
        bot.swingArm()
        const entity = bot.entityAtCursor(3.5)
        if (entity) {
          bot.attack(entity)
        } else {
          // Digging
          const block = bot.blockAtCursor(4)
          if (block) {
             try { await bot.dig(block) } catch (err) {}
          }
        }
        break

      case 'rightClickDown':
        const block = bot.blockAtCursor(4)
        
        // A: If looking at a block, try to interact (Open Chest/Door/Lever)
        if (block) {
          // We use a catch here because activateBlock throws error if block isn't interactable (like Dirt)
          bot.activateBlock(block).catch(() => {
             // B: If interaction failed (it's just a wall), use the held item (Eat/Shield)
             bot.activateItem() 
          })
        } else {
          // C: Looking at air, just use the item
          bot.activateItem() 
        }
        break

      case 'rightClickUp':
        bot.deactivateItem()
        break

      case 'middleClick': // Pick Block Logic
        const targetBlock = bot.blockAtCursor(4)
        if (targetBlock) {
           // Find an item in inventory that matches the block name
           const item = bot.inventory.items().find(i => i.name === targetBlock.name)
           if (item) {
             bot.equip(item, 'hand').then(() => {
                 console.log(`Equipped ${item.name}`)
             }).catch(err => console.log(err.message))
           } else {
             // Optional: Chat if you don't have the item
             console.log(`I don't have ${targetBlock.name}`)
           }
        }
        break

      case 'drop':
        const handItem = bot.inventory.slots[bot.getEquipmentDestSlot('hand')]
        if (handItem) {
          try { await bot.tossStack(handItem) } catch(err) {}
        }
        break
    }
  })

  // 1. Hotbar Switching
  socket.on('hotbar', (slotIndex) => {
    if (!bot || !bot.entity) return
    bot.setQuickBarSlot(slotIndex)
  })

  // 2. Inventory Request (Send full inventory when requested)
  socket.on('requestInventory', () => {
    sendInventoryUpdate()
  })

  // Helper function to send inventory to client
  function sendInventoryUpdate() {
    if (!bot) return
    // Simple representation of slots 0-44
    const simpleInv = bot.inventory.slots.map(item => {
        if (!item) return null
        return { name: item.name, count: item.count, displayName: item.displayName }
    })
    socket.emit('inventoryUpdate', simpleInv)
  }

  // Listen for inventory changes in-game and update the web
  // (Put this INSIDE createBot() so it attaches to the bot instance)
  if (bot) {
      bot.inventory.on('updateSlot', (slot, oldItem, newItem) => {
          sendInventoryUpdate()
      })
  }
})

// ... (Keep your startDataStream and startAfkRoutine functions here) ...

// Helper functions (required to keep the bot running)
function startDataStream() {
  setInterval(() => {
    if (bot && bot.entity) {
      io.emit('botUpdate', {
        pos: bot.entity.position,
        health: bot.health,
        food: bot.food,
        username: bot.username
      })
    }
  }, 1000)
}

function startAfkRoutine() {
    setInterval(() => {
      if (bot && bot.entity) {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 500)
      }
    }, 20000)
}

createBot()