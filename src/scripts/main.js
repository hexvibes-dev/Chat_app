// src/scripts/main.js
import './messages.js';
import './scroll.js';
import './keyboard.js';
import './input.js';
import './hour.js';
import './answer.js';
import './scrollButton.js';
import './reactions.js';
import { initUserRegistration } from './user.js';
import { initHamburgerMenu } from './hamburgerMenu.js';
import { loadCustomEmojis } from './EmojiPicker/EmojiData.js';

import { updateIsAtBottom } from './scroll.js';
import { updateKeyboard } from './keyboard.js';
import { input } from './input.js';
import { appendMessage } from './messages.js';
import { enableAnswerGestures } from './answer.js';

function inicializarApp() {
  if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
  if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};
  if (typeof window.ensureLastMessageAboveInput !== 'function') window.ensureLastMessageAboveInput = () => {};
  loadCustomEmojis();

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHamburgerMenu);
  } else {
    initHamburgerMenu();
  }
}

export default inicializarApp;