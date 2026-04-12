// public/socket.js
import { getUsername } from './js/user.js';

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
  if (window._socketNotifTimeout) clearTimeout(window._socketNotifTimeout);
  window._socketNotifTimeout = setTimeout(() => {
    notifEl.classList.remove('visible');
  }, duration);
}

function loadSocketIO(baseUrl) {
  return new Promise((resolve, reject) => {
    if (typeof window.io !== 'undefined') return resolve(window.io);

    const script = document.createElement('script');
    script.src = `${baseUrl}/socket.io/socket.io.js`;
    script.onload = () => {
      if (typeof window.io !== 'undefined') resolve(window.io);
      else reject(new Error('La variable global "io" no está definida'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar Socket.IO desde el servidor'));
    document.head.appendChild(script);
  });
}

export async function connectToBackend(url) {
  try {
    const io = await loadSocketIO(url);
    const username = getUsername() || 'anon';

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(url, {
      transports: ['websocket'],
      query: { username }
    });

    socket.on('connect', () => {
      console.log('✅ Socket conectado, ID:', socket.id);
      showTransientNotification(`Conectado a ${url}`);
      setTimeout(() => {
        const input = document.getElementById('input');
        if (input) input.focus();
      }, 100);
    });

    socket.on('history', (messages) => {
      console.log('📜 Historial recibido:', messages);
      // Ruta corregida: ./js/messages.js
      import('./js/messages.js').then(({ appendMessage }) => {
        messages.forEach(msg => {
          const isMe = (username && msg.senderId === username);
          appendMessage(msg.text, { me: isMe, fromSocket: true, timestamp: msg.timestamp });
        });
      }).catch(err => console.error('Error al importar messages.js para history', err));
    });

    socket.on('new-message', (msg) => {
      console.log('📩 Mensaje recibido del servidor:', msg);
      // Ruta corregida: ./js/messages.js
      import('./js/messages.js').then(({ appendMessage }) => {
        try {
          const isMe = (username && msg.senderId === username);
          console.log(`🧑 Mi username: ${username}, senderId: ${msg.senderId}, isMe: ${isMe}`);
          requestAnimationFrame(() => {
            appendMessage(msg.text, { me: isMe, fromSocket: true, timestamp: msg.timestamp });
          });
        } catch (e) {
          console.error('Error en appendMessage:', e);
        }
      }).catch(err => console.error('Error al importar messages.js para new-message', err));
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
      showTransientNotification('Desconectado del servidor');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Error de conexión:', err);
      showTransientNotification(`Error de conexión: ${err.message}`);
    });

  } catch (error) {
    console.error('❌ Error en connectToBackend:', error);
    showTransientNotification(`Error: ${error.message}`);
  }
}

export function sendMessageViaSocket(text) {
  if (socket && socket.connected) {
    console.log('📤 Enviando mensaje:', text);
    socket.emit('new-message', { text });
    return true;
  }
  showTransientNotification('No hay conexión activa. Usa /connect <url>');
  return false;
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    showTransientNotification('Desconectado manualmente');
    setTimeout(() => {
      const input = document.getElementById('input');
      if (input) input.focus();
    }, 100);
  }
}