// public/js/queue.js
let socketInstance = null;
const eventQueue = [];
let isProcessing = false;

function showQueueNotification(text, duration = 1500) {
  let notifEl = document.querySelector('.transient-notif');
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    notifEl.style.pointerEvents = 'none';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  if (window._queueNotifTimeout) clearTimeout(window._queueNotifTimeout);
  window._queueNotifTimeout = setTimeout(() => {
    notifEl.classList.remove('visible');
  }, duration);
}

export function setSocket(socket) {
  socketInstance = socket;
  processQueue();
}

export function enqueueEvent(eventName, payload, ackCallback) {
  eventQueue.push({ eventName, payload, ackCallback, retries: 0 });
  showQueueNotification(`📦 En cola: ${eventName}`, 800);
  processQueue();
}

function processQueue() {
  if (!socketInstance || !socketInstance.connected) {
    return;
  }
  if (isProcessing) return;
  if (eventQueue.length === 0) return;

  isProcessing = true;

  const processNext = () => {
    if (eventQueue.length === 0) {
      isProcessing = false;
      return;
    }

    const event = eventQueue[0];

    socketInstance.emit(event.eventName, event.payload, (response) => {
      if (response && response.ok) {
        showQueueNotification(`✅ ${event.eventName} procesado`, 800);
        if (event.ackCallback) event.ackCallback(true, response);
        eventQueue.shift();
        processNext();
      } else {
        event.retries = (event.retries || 0) + 1;
        if (event.retries > 3) {
          showQueueNotification(`❌ ${event.eventName} falló`, 2000);
          if (event.ackCallback) event.ackCallback(false);
          eventQueue.shift();
          processNext();
        } else {
          showQueueNotification(`🔄 Reintentando ${event.eventName} (${event.retries}/3)`, 1000);
          setTimeout(processNext, 1000 * event.retries);
        }
      }
    });
  };

  processNext();
}

export function isQueueEmpty() {
  return eventQueue.length === 0;
}
