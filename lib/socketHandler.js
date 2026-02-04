// --- 1. Module State ---
const chatHistory = [];
let lastJumpTime = 0;
let isFlying = false;

// --- 2. Sub-Functions (The Logic) ---

/**
 * Sends the current inventory state to all connected clients.
 */
const sendInventory = (io, bot) => {
    if (!bot) return;
    
    const simpleInv = bot.inventory.slots.map(item => {
        if (!item) return null;
        return { name: item.name, count: item.count, displayName: item.displayName };
    });
    
    io.emit('inventoryUpdate', simpleInv);
};

/**
 * Handles WASD, Jump, and the Double-Jump Flight logic.
 */
const handleMovement = (bot, data) => {
    if (!bot || !bot.entity) return;

    // Double Jump Logic
    if (data.action === 'jump' && data.state === true) {
        const now = Date.now();
        if (now - lastJumpTime < 300) {
            if (!isFlying) {
                bot.creative.startFlying();
                isFlying = true;
                bot.chat('Flying enabled!');
            } else {
                bot.creative.stopFlying();
                isFlying = false;
                bot.chat('Flying disabled!');
            }
        }
        lastJumpTime = now;
    }

    bot.setControlState(data.action, data.state);
};

/**
 * Handles complex interactions: Clicks, Digging, and Dropping items.
 */
const handleAction = async (bot, type) => {
    if (!bot || !bot.entity) return;

    switch (type) {
        case 'leftClick':
            bot.swingArm();
            const entity = bot.entityAtCursor(3.5);
            if (entity) {
                bot.attack(entity);
            } else {
                const block = bot.blockAtCursor(4);
                if (block) {
                    try { await bot.dig(block); } catch (err) {}
                }
            }
            break;

        case 'rightClickDown':
            const block = bot.blockAtCursor(4);
            if (block) {
                // Try to interact, fallback to item use
                bot.activateBlock(block).catch(() => {
                    bot.activateItem();
                });
            } else {
                bot.activateItem();
            }
            break;

        case 'rightClickUp':
            bot.deactivateItem();
            break;

        case 'middleClick':
            const targetBlock = bot.blockAtCursor(4);
            if (targetBlock) {
                const item = bot.inventory.items().find(i => i.name === targetBlock.name);
                if (item) {
                    bot.equip(item, 'hand').catch(console.log);
                } else {
                    console.log(`Don't have ${targetBlock.name}`);
                }
            }
            break;

        case 'drop':
            const handItem = bot.inventory.slots[bot.getEquipmentDestSlot('hand')];
            if (handItem) {
                try { await bot.tossStack(handItem); } catch (err) {}
            }
            break;
    }
};

/**
 * Sets up listeners on the BOT itself (Chat & Inventory changes).
 * These push data FROM the game TO the web.
 */
const setupBotListeners = (io, bot) => {
    // Inventory Changes
    // Remove old listener to prevent duplicates if function called multiple times
    bot.inventory.removeAllListeners('updateSlot'); 
    bot.inventory.on('updateSlot', () => sendInventory(io, bot));

    // Chat Messages
    bot.removeAllListeners('message');
    bot.on('message', (jsonMsg) => {
        const text = jsonMsg.toString();
        let user = "Server";
        
        // Basic username parsing
        if (text.startsWith('<')) {
            user = text.split('>')[0].replace('<', '');
        }
        
        const msgData = { user: user, text: text, isBot: (user === bot.username) };

        // Update History
        chatHistory.push(msgData);
        if (chatHistory.length > 50) chatHistory.shift();
        
        // Send to Web
        io.emit('chatMessage', msgData);
    });
};

// --- 3. Main Export ---

module.exports = function(io, bot) {
    
    // Initialize Bot-to-Web listeners immediately
    setupBotListeners(io, bot);

    // Initialize Web-to-Bot listeners (Socket.io)
    io.on('connection', (socket) => {
        
        // 1. Initial State
        socket.emit('history', chatHistory);

        // 2. Chat
        socket.on('sendChat', (text) => {
            if (bot) bot.chat(text);
        });

        // 3. Movement
        socket.on('controlState', (data) => handleMovement(bot, data));

        // 4. Look
        socket.on('look', (data) => {
            if (!bot || !bot.entity) return;
            bot.look(bot.entity.yaw - data.yaw, bot.entity.pitch - data.pitch);
        });

        // 5. Inventory Managment
        socket.on('hotbar', (slotIndex) => {
            if (bot) bot.setQuickBarSlot(slotIndex);
        });

        socket.on('requestInventory', () => sendInventory(io, bot));

        // 6. Actions (Clicks)
        socket.on('action', (type) => handleAction(bot, type));
    });
};