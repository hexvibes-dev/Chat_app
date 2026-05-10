// EmojiPickerButton.js
import { initMobileEmojiPicker } from './EmojiPicker.js';
import { showDesktopEmojiPicker } from './EmojiPickerDesktop.js';
import { playClick } from './soundManager.js';
import debug from './DebugLogger.js';

let isOpen = false;
let container = null;
let isClosing = false;
let ignoreClose = false;
let ignoreCloseTimeout = null;

function isMobileLayout() {
  return window.innerWidth <= 800 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function updateOverlayElements(open) {
  const extraBottom = open ? 400 : 0;
  const replyPopup = document.getElementById('replyPopup');
  const notif = document.querySelector('.transient-notif');
  const scrollBtn = document.getElementById('scrollToBottomBtn');
  
  if (replyPopup) replyPopup.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
  if (notif) notif.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
  if (scrollBtn) scrollBtn.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
}

function setMessagesBottomInstant(addPickerHeight) {
  const layerMessages = document.querySelector('.layer-messages');
  if (!layerMessages) return;
  const keyboard = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
  const baseBottom = 60;
  const extra = addPickerHeight ? 400 : 0;
  const newBottom = baseBottom + keyboard + extra;
  layerMessages.style.transition = 'none';
  layerMessages.style.bottom = newBottom + 'px';
  layerMessages.offsetHeight;
}

function restoreMessagesTransition() {
  const layerMessages = document.querySelector('.layer-messages');
  if (layerMessages) layerMessages.style.transition = '';
}

function forceScrollable() {
  const messages = document.getElementById('messages');
  if (messages) {
    messages.style.overflowY = 'auto';
    messages.style.touchAction = 'pan-y';
    messages.style.webkitOverflowScrolling = 'touch';
  }
  document.body.style.overflow = '';
  document.body.style.touchAction = 'pan-y pinch-zoom';
  document.documentElement.style.overflow = '';
  document.documentElement.style.touchAction = 'pan-y pinch-zoom';
}

function openMobilePicker() {
  debug.log('openMobilePicker llamado');
  if (isOpen || isClosing) return;
  container = document.getElementById('mobile-picker-container');
  if (!container) {
    debug.logError('No se encontró #mobile-picker-container');
    return;
  }
  
  setMessagesBottomInstant(true);
  restoreMessagesTransition();
  container.classList.add('open');
  forceScrollable();
  
  isOpen = true;
  updateOverlayElements(true);
  if (!window.history.state || !window.history.state.pickerOpen) {
    window.history.pushState({ pickerOpen: true }, '');
  }
  
  window.dispatchEvent(new CustomEvent('picker-opened'));
  debug.logSuccess('Picker abierto');
  
  if (window.emojiPicker && window.emojiPicker.refreshRecent) {
    window.emojiPicker.refreshRecent();
  }
  
  setTimeout(() => {
    const messages = document.getElementById('messages');
    if (messages && messages.scrollHeight > messages.clientHeight) {
      messages.scrollTop = messages.scrollHeight;
    }
    if (typeof window.updateIsAtBottom === 'function') window.updateIsAtBottom();
    const scrollBtn = document.getElementById('scrollToBottomBtn');
    if (scrollBtn && window.isAtBottom === false) scrollBtn.style.display = 'flex';
  }, 100);
}

function closeMobilePicker() {
  debug.log('closeMobilePicker llamado');
  if (ignoreClose) {
    debug.log('Ignorando cierre porque ignoreClose=true');
    return;
  }
  if (!isOpen || isClosing) return;
  if (!container) return;
  isClosing = true;
  
  container.classList.remove('open');
  setMessagesBottomInstant(false);
  restoreMessagesTransition();
  forceScrollable();
  updateOverlayElements(false);
  
  window.dispatchEvent(new CustomEvent('picker-closed'));
  debug.logSuccess('Picker cerrado');
  
  setTimeout(() => {
    isOpen = false;
    isClosing = false;
    if (window.history.state && window.history.state.pickerOpen) {
      window.history.back();
    }
  }, 350);
}

function toggleMobilePicker() {
  debug.log('toggleMobilePicker');
  if (isOpen) closeMobilePicker();
  else openMobilePicker();
}

function onPopState(event) {
  debug.log('onPopState');
  if (isOpen) {
    event.preventDefault();
    closeMobilePicker();
  }
}

export function initEmojiPickerButton() {
  debug.log('initEmojiPickerButton');
  const btn = document.getElementById('emojiPickerBtn');
  if (!btn) {
    debug.logError('Botón emojiPickerBtn no encontrado');
    return;
  }
  
  btn.addEventListener('click', (e) => {
    debug.log('Click en botón emojiPickerBtn');
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
  if (container && !container.innerHTML.trim()) {
    debug.log('Inicializando mobile picker');
    const onInsertStart = () => {
      debug.log('onInsertStart');
    };
    initMobileEmojiPicker(container, onInsertStart);
  }
  
  window.addEventListener('popstate', onPopState);
  
  document.addEventListener('click', (e) => {
    if (ignoreClose) return;
    if (isOpen && container && !container.contains(e.target) && !btn.contains(e.target)) {
      debug.log('Click fuera del picker, cerrando');
      closeMobilePicker();
    }
  });
  
  window.__setIgnoreClose = (val) => {
    if (ignoreCloseTimeout) clearTimeout(ignoreCloseTimeout);
    ignoreClose = val;
    if (val) {
      ignoreCloseTimeout = setTimeout(() => {
        ignoreClose = false;
        debug.log('ignoreClose restablecido a false');
      }, 500);
    }
  };
}