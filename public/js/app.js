// Initialize Socket
const socket = io();

// Initialize Modules
// These functions are available because we load the other scripts first in HTML
setupChat(socket);
setupGPS(socket);
setupControls(socket);
renderInventory(socket); // Setup inventory listener (used in Controls page)

// Manual buttons on Controls page (if any exist)
const controlButtons = document.querySelectorAll('.ctrl-btn');
controlButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        socket.emit('control', action); // Send legacy simple command
    });
});