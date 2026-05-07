// src/scripts/socketUtils.js
import { enqueueEvent } from './queue.js';
import { showNotification } from './notifications.js';

let socket = null;

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

export function setSocket(newSocket) {
  socket = newSocket;
  if (socket) {
    console.log('🔌 Socket registrado en socketUtils');
    showTransientNotification('🔌 Socket listo para eventos');
  }
}

export function getSocket() {
  return socket;
}

export function emitSocketEvent(event, data) {
  enqueueEvent(event, data, (ok) => {
    if (!ok) console.warn(`⚠️ Evento no confirmado por el servidor: ${event}`);
  });
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}