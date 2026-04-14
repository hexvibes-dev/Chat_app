// public/js/socketUtils.js
import { enqueueEvent } from './queue.js';

let socket = null;

function showTransientNotification(text, duration = 2000) {
  let notifEl = document.querySelector('.transient-notif');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    notifEl.style.pointerEvents = 'none';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  if (window._socketUtilsNotifTimeout) clearTimeout(window._socketUtilsNotifTimeout);
  window._socketUtilsNotifTimeout = setTimeout(() => {
    notifEl.classList.remove('visible');
  }, duration);
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
