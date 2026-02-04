const socket = io();

// --- CHAT PAGE LOGIC ---
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

if (chatBox) {
    function addMessageToScreen(data) {
        const div = document.createElement('div');
        div.className = 'msg';
        
        // Determine the color class based on the username
        let userClass = 'user-regular'; // Default blue

        if (data.user === 'AFK_Bot_1') {
            userClass = 'user-bot';    // Green
        } else if (data.user === 'Server' || data.user === 'System') {
            userClass = 'user-server'; // Purple
        }
        
        // Apply the class to the Name part only
        div.innerHTML = `<b class="${userClass}">${data.user}:</b> <span>${data.text}</span>`;
        
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 1. Receive History (The 50 saved messages)
    socket.on('history', (historyArray) => {
        chatBox.innerHTML = ''; // Clear current view
        historyArray.forEach(msg => addMessageToScreen(msg));
    });

    // 2. Receive Live Messages
    socket.on('chatMessage', (data) => addMessageToScreen(data));

    // 3. Send Message
    function sendMessage() {
        const text = msgInput.value.trim();
        if (text !== "") {
            socket.emit('sendChat', text);
            msgInput.value = '';
        }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (msgInput) msgInput.addEventListener('keypress', (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

// --- GPS PAGE LOGIC ---
const healthDisplay = document.getElementById('health');
if (healthDisplay) {
    socket.on('botUpdate', (data) => {
        document.getElementById('health').innerText = Math.round(data.health);
        document.getElementById('food').innerText = Math.round(data.food);
        const pos = data.pos;
        document.getElementById('coords').innerText = `X: ${Math.round(pos.x)} | Y: ${Math.round(pos.y)} | Z: ${Math.round(pos.z)}`;
    });
}

// --- CONTROLS PAGE LOGIC ---
// Look for buttons with the class "ctrl-btn"
const controlButtons = document.querySelectorAll('.ctrl-btn');
controlButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        socket.emit('control', action); // Send command to server
    });
});
// --- ADVANCED CONTROLS LOGIC ---
const controlZone = document.getElementById('control-zone');

if (controlZone) {
    let isControlling = false;

    // 1. Activate Controls on Click
    controlZone.addEventListener('click', () => {
        controlZone.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === controlZone) {
            isControlling = true;
            controlZone.classList.add('active-zone');
            controlZone.innerText = "CONTROLS ACTIVE (WASD to Move, Click to Attack)";
        } else {
            isControlling = false;
            controlZone.classList.remove('active-zone');
            controlZone.innerText = "Click to Capture Mouse";
            // Stop everything when unlocking
            ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].forEach(key => {
                socket.emit('controlState', { action: key, state: false });
            });
            socket.emit('action', 'rightClickUp'); // Release right click if held
        }
    });

    // 2. Mouse Look
    document.addEventListener('mousemove', (e) => {
        if (!isControlling) return;
        const sensitivity = 0.005; 
        socket.emit('look', {
            yaw: e.movementX * sensitivity,
            pitch: e.movementY * sensitivity
        });
    });

    // 3. Mouse Clicks (Left & Right)
    document.addEventListener('mousedown', (e) => {
        if (!isControlling) return;
        
        // 0 = Left Click, 2 = Right Click
        if (e.button === 0) {
            socket.emit('action', 'leftClick');
        } else if (e.button === 2) {
            socket.emit('action', 'rightClickDown');
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (!isControlling) return;
        
        if (e.button === 2) {
            socket.emit('action', 'rightClickUp');
        }
    });

    // 4. Enhanced Keyboard Map
    const keyMap = {
        'w': 'forward',
        'a': 'left',
        's': 'back',
        'd': 'right',
        ' ': 'jump',
        'shift': 'sprint',   // Hold Shift to run
        'control': 'sneak' // Hold Ctrl to crouch
    };

    document.addEventListener('keydown', (e) => {
        if (!isControlling) return;
        
        const key = e.key.toLowerCase();

        // Movement Keys
        if (keyMap[key]) {
            socket.emit('controlState', { action: keyMap[key], state: true });
        }
        
        // Special Keys (Trigger once)
        if (key === 'q') {
            socket.emit('action', 'drop'); // Drop item
        }
    });

    document.addEventListener('keyup', (e) => {
        if (!isControlling) return;
        
        const key = e.key.toLowerCase();
        if (keyMap[key]) {
            socket.emit('controlState', { action: keyMap[key], state: false });
        }
    });
}