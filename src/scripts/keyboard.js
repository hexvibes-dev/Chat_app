// src/scripts/keyboard.js
import { input } from './input.js';

if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};

export let keyboardOpen = false;
window.keyboardOpen = keyboardOpen;

let lastViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

function detectKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  
  const viewportHeight = vv.height;
  const keyboardHeight = Math.max(0, window.innerHeight - viewportHeight);
  const isOpen = keyboardHeight > 80;
  
  document.documentElement.style.setProperty('--keyboard', keyboardHeight + 'px');
  
  if (isOpen !== keyboardOpen) {
    keyboardOpen = isOpen;
    window.keyboardOpen = keyboardOpen;
    if (keyboardOpen) {
      document.documentElement.classList.add('keyboard-open');
      document.body.classList.add('keyboard-open');
    } else {
      document.documentElement.classList.remove('keyboard-open');
      document.body.classList.remove('keyboard-open');
    }
    try {
      const ev = new CustomEvent('keyboardchange', { detail: { keyboard: keyboardHeight, isOpen } });
      window.dispatchEvent(ev);
    } catch (err) {}
  }
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', detectKeyboard);
  window.visualViewport.addEventListener('scroll', detectKeyboard);
  detectKeyboard();
}

if (window.ResizeObserver) {
  const resizeObserver = new ResizeObserver(() => {
    detectKeyboard();
  });
  resizeObserver.observe(document.documentElement);
}

export function updateKeyboard() {
  detectKeyboard();
}