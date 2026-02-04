// --- CHAT LOGIC ---
function setupChat(socket) {
    const chatBox = document.getElementById('chat-box');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!chatBox) return;

    function addMessageToScreen(data) {
        const div = document.createElement('div');
        div.className = 'msg';
        
        let userClass = 'user-regular';
        if (data.user === 'AFK_Bot_1') userClass = 'user-bot';
        else if (data.user === 'Server' || data.user === 'System') userClass = 'user-server';
        
        div.innerHTML = `<b class="${userClass}">${data.user}:</b> <span>${data.text}</span>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    socket.on('history', (history) => {
        chatBox.innerHTML = '';
        history.forEach(addMessageToScreen);
    });

    socket.on('chatMessage', addMessageToScreen);

    const sendMessage = () => {
        const text = msgInput.value.trim();
        if (text) {
            socket.emit('sendChat', text);
            msgInput.value = '';
        }
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (msgInput) msgInput.addEventListener('keypress', (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

// --- GPS LOGIC ---
function setupGPS(socket) {
    const healthDisplay = document.getElementById('health');
    if (!healthDisplay) return;

    socket.on('botUpdate', (data) => {
        document.getElementById('health').innerText = Math.round(data.health);
        document.getElementById('food').innerText = Math.round(data.food);
        const { x, y, z } = data.pos;
        document.getElementById('coords').innerText = `X: ${Math.round(x)} | Y: ${Math.round(y)} | Z: ${Math.round(z)}`;
    });
}

// --- INVENTORY RENDER LOGIC ---
function renderInventory(socket) {
    const inventoryScreen = document.getElementById('inventory-screen');
    
    socket.on('inventoryUpdate', (slots) => {
        if (!inventoryScreen || inventoryScreen.classList.contains('hidden')) return;
        renderGrid('inv-hotbar', slots.slice(36, 45)); 
        renderGrid('inv-main', slots.slice(9, 36));    
    });

    function renderGrid(elementId, items) {
        const container = document.getElementById(elementId);
        if(!container) return;
        container.innerHTML = ''; 

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'slot';
            // Highlight active hotbar slot logic can be added here if we track state
            if (item) {
                div.innerHTML = `${item.name.replace(/_/g, ' ')} <span>${item.count}</span>`;
                div.title = item.displayName;
            }
            container.appendChild(div);
        });
    }
}