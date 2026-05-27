import { initMobileEmojiPicker } from './EmojiPicker.js';
import { showDesktopEmojiPicker } from './EmojiPickerDesktop.js';
import { playClick } from '../Sounds/soundManager.js';

let isOpen = false;
let container = null;
let isClosing = false;
let ignoreClose = false;
let ignoreCloseTimeout = null;
let mobileOnInsertStart = null;
let pickerInitialized = false;
let closeTimeout = null;

function isMobileLayout() {
  return window.innerWidth <= 800 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function openMobilePicker() {
  if (isOpen || isClosing) return;
  container = document.getElementById('mobile-picker-container');
  if (!container) return;
  
  if (!pickerInitialized) {
    const onInsert = mobileOnInsertStart || (() => {});
    initMobileEmojiPicker(container, onInsert);
    pickerInitialized = true;
  }
  
  container.classList.add('open');
  isOpen = true;
  
  if (!window.history.state || !window.history.state.pickerOpen) {
    window.history.pushState({ pickerOpen: true }, '');
  }
  
  window.dispatchEvent(new CustomEvent('picker-opened'));
  
  if (window.emojiPicker && window.emojiPicker.refreshRecent) {
    window.emojiPicker.refreshRecent();
  }
}

function closeMobilePicker() {
  if (ignoreClose) return;
  if (!isOpen || isClosing) return;
  if (!container) return;
  isClosing = true;
  
  container.classList.remove('open');
  window.dispatchEvent(new CustomEvent('picker-closed'));
  
  setTimeout(() => {
    isOpen = false;
    isClosing = false;
    if (window.history.state && window.history.state.pickerOpen) {
      window.history.back();
    }
  }, 350);
}

function toggleMobilePicker() {
  if (isOpen) closeMobilePicker();
  else openMobilePicker();
}

function onPopState(event) {
  if (isOpen) {
    event.preventDefault();
    closeMobilePicker();
  }
}

export function initEmojiPickerButton() {
  const btn = document.getElementById('emojiPickerBtn');
  if (!btn) return;
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playClick();
    if (isMobileLayout()) {
      toggleMobilePicker();
    } else {
      showDesktopEmojiPicker();
    }
  });
  
  container = document.getElementById('mobile-picker-container');
  if (container) {
    mobileOnInsertStart = () => {};
    pickerInitialized = false;
  }
  
  window.addEventListener('popstate', onPopState);
  
  // Función auxiliar para verificar si el evento debe IGNORAR el cierre
  function shouldIgnoreClose(target) {
    let element = target;
    
    // Elementos que NO deben cerrar el picker
    const sendBtn = document.getElementById('sendBtn');
    const actionMenuBtn = document.getElementById('actionMenuBtn');
    const emojiBtn = document.getElementById('emojiPickerBtn');
    
    const ignoreElements = [container, sendBtn, actionMenuBtn, emojiBtn].filter(el => el !== null);
    
    while (element && element !== document.body) {
      if (ignoreElements.includes(element)) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }
  
  // Detectar toque en el input (para cerrar el picker y abrir teclado)
  const input = document.getElementById('layerInput');
  if (input) {
    input.addEventListener('touchstart', (e) => {
      // Solo cerrar si el toque NO debe ser ignorado
      if (!shouldIgnoreClose(e.target) && isOpen) {
        if (closeTimeout) clearTimeout(closeTimeout);
        closeTimeout = setTimeout(() => {
          if (isOpen) {
            closeMobilePicker();
          }
          closeTimeout = null;
        }, 50);
      }
    });
    
    input.addEventListener('focus', (e) => {
      if (!shouldIgnoreClose(e.target) && isOpen) {
        if (closeTimeout) clearTimeout(closeTimeout);
        closeTimeout = setTimeout(() => {
          if (isOpen) {
            closeMobilePicker();
          }
          closeTimeout = null;
        }, 50);
      }
    });
  }
  
  window.__setIgnoreClose = (val) => {
    if (ignoreCloseTimeout) clearTimeout(ignoreCloseTimeout);
    ignoreClose = val;
    if (val) {
      ignoreCloseTimeout = setTimeout(() => {
        ignoreClose = false;
      }, 500);
    }
  };
}