// public/socket.js
import { getUsername } from './user.js';
import { setSocket as setUtilsSocket, emitSocketEvent, isSocketConnected } from './socketUtils.js';
import { setSocket as setQueueSocket } from './queue.js';
import { addReactionRemotely, removeReactionRemotely, playReactionAnimation } from './reactions.js';
import { deleteMessageRemotely, editMessageRemotely, appendMessage } from './messages.js';

let socket = null;
let heartbeatInterval = null;

function updateConnectionIndicator(connected) {
  let indicator = document.getElementById('connection-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'connection-indicator';
    indicator.style.cssText = 'position:fixed;top:70px;right:10px;width:12px;height:12px;border-radius:50%;z-index:99999;transition:background 0.3s;';
    document.body.appendChild(indicator);
  }
  indicator.style.backgroundColor = connected ? '#2dd4bf' : '#f87171';
  indicator.title = connected ? 'Conectado' : 'Desconectado';
}

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
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    socket = io(url, {
      transports: ['websocket'],
      query: { username },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    setUtilsSocket(socket);
    setQueueSocket(socket);

    socket.on('connect', () => {
      console.log('✅ Socket conectado, ID:', socket.id);
      updateConnectionIndicator(true);
      showTransientNotification(`Conectado a ${url}`);

      heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit('heartbeat', { timestamp: Date.now() });
        }
      }, 15000);
    });

    socket.on('heartbeat-ack', () => {
      console.log('💓 Heartbeat OK');
    });

    socket.on('history', (messages) => {
      console.log('📜 Historial recibido:', messages);
      messages.forEach(msg => {
        const isMe = (username && msg.senderId === username);
        appendMessage(msg.text, {
          me: isMe,
          fromSocket: true,
          timestamp: msg.timestamp,
          replyTo: msg.replyTo,
          msgId: msg.msgId
        });
      });
    });

    socket.on('new-message', (msg) => {
      console.log('📩 new-message recibido:', msg);
      const isMe = (username && msg.senderId === username);
      requestAnimationFrame(() => {
        appendMessage(msg.text, {
          me: isMe,
          fromSocket: true,
          timestamp: msg.timestamp,
          replyTo: msg.replyTo,
          msgId: msg.msgId
        });
      });
    });

    socket.on('reaction:add', ({ msgId, emoji, senderId }) => {
      showTransientNotification(`❤️ Reacción: ${emoji}`, 1000);
      addReactionRemotely(msgId, emoji, senderId);
    });

    socket.on('reaction:remove', ({ msgId, emoji, senderId }) => {
      showTransientNotification(`💔 Eliminada: ${emoji}`, 1000);
      removeReactionRemotely(msgId, emoji, senderId);
    });

    socket.on('reaction:animation', ({ msgId, emoji }) => {
      showTransientNotification(`✨ Animación: ${emoji}`, 1000);
      playReactionAnimation(msgId, emoji);
    });

    socket.on('message:delete', ({ msgId }) => {
      showTransientNotification(`🗑️ Eliminado`, 1000);
      deleteMessageRemotely(msgId);
    });

    socket.on('message:edit', ({ msgId, newText }) => {
      showTransientNotification(`✏️ Editado`, 1000);
      editMessageRemotely(msgId, newText);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket desconectado:', reason);
      updateConnectionIndicator(false);
      showTransientNotification('Conexión perdida. Reconectando...', 3000);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Error de conexión:', err);
      updateConnectionIndicator(false);
      showTransientNotification(`Error de conexión: ${err.message}`);
    });

  } catch (error) {
    console.error('❌ Error en connectToBackend:', error);
    showTransientNotification(`Error: ${error.message}`);
  }
}

export { emitSocketEvent, isSocketConnected };

export function sendMessageViaSocket(text, replyTo = null) {
  if (socket && socket.connected) {
    console.log('📤 Enviando mensaje:', text, replyTo ? '(respuesta)' : '');
    socket.emit('new-message', { text, replyTo });
    return true;
  }
  showTransientNotification('No hay conexión activa. Usa /connect <url>');
  return false;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    setUtilsSocket(null);
    setQueueSocket(null);
    updateConnectionIndicator(false);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    showTransientNotification('Desconectado manualmente');
    setTimeout(() => {
      const input = document.getElementById('input');
      if (input) input.focus();
    }, 100);
  }
}