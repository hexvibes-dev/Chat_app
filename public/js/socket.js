import io from 'socket.io-client';
import { appendMessage } from './messages.js';

let socket = null;

function showNotif(text) {
  let notifEl = document.querySelector('.transient-notif');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  setTimeout(() => {
    notifEl.classList.remove('visible');
  }, 1000);
}

export function connectToBackend(url) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(url, { transports: ['websocket'] });

  socket.on('connect', () => showNotif('Conectado al servidor'));
  socket.on('history', (messages) => {
    messages.forEach(msg => appendMessage(msg.text, { me: false, fromSocket: true, timestamp: msg.timestamp }));
  });
  socket.on('new-message', (msg) => appendMessage(msg.text, { me: false, fromSocket: true, timestamp: msg.timestamp }));
  socket.on('disconnect', () => showNotif('Desconectado del servidor'));
  socket.on('connect_error', (err) => showNotif('Error: ' + err.message));
}

export function sendMessageViaSocket(text) {
  if (socket && socket.connected) {
    socket.emit('new-message', { text });
    return true;
  }
  showNotif('No conectado. Usa /connect <url>');
  return false;
}

export function isConnected() {
  return socket && socket.connected;
}
