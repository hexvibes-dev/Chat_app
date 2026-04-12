// public/main.js
import './js/messages.js';
import './js/scroll.js';
import './js/keyboard.js';
import './js/input.js';
import './js/hour.js';
import './js/answer.js';
import './js/scrollButton.js';
import './js/reactions.js';
import { initUserRegistration } from './js/user.js';

import { updateIsAtBottom } from './js/scroll.js';
import { updateKeyboard } from './js/keyboard.js';
import { input } from './js/input.js';
import { appendMessage } from './js/messages.js';
import { enableAnswerGestures } from './js/answer.js';

if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};
if (typeof window.ensureLastMessageAboveInput !== 'function') window.ensureLastMessageAboveInput = () => {};

// Iniciar registro de usuario cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserRegistration);
} else {
  initUserRegistration();
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateKeyboard);
}

const messagesEl = document.getElementById('messages');
if (messagesEl) {
  messagesEl.addEventListener('scroll', updateIsAtBottom);
}

if (input) {
  input.addEventListener('focus', () => {
    setTimeout(updateKeyboard, 100);
    if (window.isAtBottom) {
      setTimeout(() => {
        if (typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
        const kb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        setTimeout(() => {
          if (typeof window.ensureLastMessageAboveInput === 'function') window.ensureLastMessageAboveInput(kb);
        }, 80);
      }, 120);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!window.keyboardOpen) document.documentElement.style.setProperty('--keyboard', '0px');
    }, 100);
  });
}

for (let i = 1; i <= 6; i++) appendMessage('Mensaje de ejemplo ' + i);
setTimeout(() => appendMessage('Mensaje entrante: Hola, este es un nuevo mensaje.'), 2000);
setTimeout(updateIsAtBottom, 50);

if (messagesEl) {
  new ResizeObserver(() => updateIsAtBottom()).observe(messagesEl);
}

enableAnswerGestures();