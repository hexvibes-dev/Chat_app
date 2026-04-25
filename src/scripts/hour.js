// src/scripts/hour.js

export function getCurrentHour() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function appendHour(div) {
  const time = document.createElement('div');
  time.className = 'msg-hour';
  time.innerText = getCurrentHour();
  div.appendChild(time);
}
