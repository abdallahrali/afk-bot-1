function setupControls(socket) {
    const controlZone = document.getElementById('control-zone');
    const inventoryScreen = document.getElementById('inventory-screen');
    if (!controlZone) return;

    let isControlling = false;
    let currentSlot = 0;

    // 1. Pointer Lock
    controlZone.addEventListener('click', () => controlZone.requestPointerLock());

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === controlZone) {
            isControlling = true;
            controlZone.classList.add('active-zone');
            controlZone.innerText = "CONTROLS ACTIVE (WASD / Mouse)";
        } else {
            isControlling = false;
            controlZone.classList.remove('active-zone');
            controlZone.innerText = "Click to Capture Mouse";
            // Stop movement
            ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].forEach(key => {
                socket.emit('controlState', { action: key, state: false });
            });
            socket.emit('action', 'rightClickUp');
        }
    });

    // 2. Mouse Input
    document.addEventListener('mousemove', (e) => {
        if (!isControlling) return;
        socket.emit('look', { yaw: e.movementX * 0.005, pitch: e.movementY * 0.005 });
    });

    document.addEventListener('mousedown', (e) => {
        if (!isControlling) return;
        if (e.button === 0) socket.emit('action', 'leftClick');
        else if (e.button === 1) socket.emit('action', 'middleClick');
        else if (e.button === 2) socket.emit('action', 'rightClickDown');
    });

    document.addEventListener('mouseup', (e) => {
        if (!isControlling) return;
        if (e.button === 2) socket.emit('action', 'rightClickUp');
    });

    document.addEventListener('wheel', (e) => {
        if (!isControlling) return;
        if (e.deltaY > 0) currentSlot++; else currentSlot--;
        if (currentSlot > 8) currentSlot = 0;
        if (currentSlot < 0) currentSlot = 8;
        socket.emit('hotbar', currentSlot);
    });

    // 3. Keyboard Input
    const keyMap = { 'w': 'forward', 'a': 'left', 's': 'back', 'd': 'right', ' ': 'jump', 'shift': 'sprint', 'control': 'sneak' };

    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Inventory Toggle
        if (key === 'e') {
            if (isControlling) {
                document.exitPointerLock();
                inventoryScreen.classList.remove('hidden');
                socket.emit('requestInventory');
            } else {
                inventoryScreen.classList.add('hidden');
            }
            return;
        }

        if (!isControlling) return;

        // Hotbar 1-9
        const num = parseInt(key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
            currentSlot = num - 1;
            socket.emit('hotbar', currentSlot);
        }

        // Movement & Drops
        if (keyMap[key]) socket.emit('controlState', { action: keyMap[key], state: true });
        if (key === 'q') socket.emit('action', 'drop');
    });

    document.addEventListener('keyup', (e) => {
        if (!isControlling) return;
        const key = e.key.toLowerCase();
        if (keyMap[key]) socket.emit('controlState', { action: keyMap[key], state: false });
    });
}