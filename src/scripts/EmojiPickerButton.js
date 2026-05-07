import { initMobileEmojiPicker } from './EmojiPicker.js';

let isOpen = false;
let container = null;
let isClosing = false;
let ignoreFocusOnce = false;
let isInserting = false;

function isMobileLayout() {
  return window.innerWidth <= 800 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function updateOverlayElements(open) {
  const extraBottom = open ? 400 : 0;
  const replyPopup = document.getElementById('replyPopup');
  const notif = document.querySelector('.transient-notif');
  const scrollBtn = document.getElementById('scrollToBottomBtn');
  
  if (replyPopup) {
    replyPopup.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
  }
  if (notif) {
    notif.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
  }
  if (scrollBtn) {
    scrollBtn.style.bottom = `calc(60px + ${extraBottom}px + 10px)`;
  }
}

function openPicker() {
  if (isOpen || isClosing) return;
  container = document.getElementById('mobile-picker-container');
  if (!container) return;
  
  const inputEl = document.getElementById('input');
  if (inputEl && document.activeElement === inputEl) {
    inputEl.blur();
    setTimeout(() => {
      container.classList.add('open');
      isOpen = true;
      updateOverlayElements(true);
      if (!window.history.state || !window.history.state.pickerOpen) {
        window.history.pushState({ pickerOpen: true }, '');
      }
    }, 50);
    return;
  }
  
  container.classList.add('open');
  isOpen = true;
  updateOverlayElements(true);
  if (!window.history.state || !window.history.state.pickerOpen) {
    window.history.pushState({ pickerOpen: true }, '');
  }
}

function closePicker() {
  if (!isOpen || isClosing) return;
  if (!container) return;
  isClosing = true;
  container.classList.remove('open');
  updateOverlayElements(false);
  setTimeout(() => {
    isOpen = false;
    isClosing = false;
    if (window.history.state && window.history.state.pickerOpen) {
      window.history.back();
    }
  }, 250);
}

function togglePicker() {
  if (isOpen) closePicker();
  else openPicker();
}

function onInputFocus() {
  // No cerrar si estamos insertando un emoji/sticker
  if (isOpen && !ignoreFocusOnce && !isInserting) closePicker();
}

function onInputBlur() {
  if (window._ignoreBlurForPicker) return;
}

function onPopState(event) {
  if (isOpen) {
    event.preventDefault();
    closePicker();
  }
}

export function initEmojiPickerButton() {
  const btn = document.getElementById('emojiPickerBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobileLayout()) togglePicker();
  });
  
  container = document.getElementById('mobile-picker-container');
  if (container && !container.innerHTML.trim()) {
    // Función que se ejecutará cuando el picker inserte un emoji/sticker
    const onInsertStart = () => {
      isInserting = true;
      // Pequeño retraso para permitir que la inserción complete su foco
      setTimeout(() => {
        isInserting = false;
      }, 300);
    };
    initMobileEmojiPicker(container, onInsertStart);
  }
  
  const inputEl = document.getElementById('input');
  if (inputEl) {
    inputEl.addEventListener('focus', onInputFocus);
    inputEl.addEventListener('blur', onInputBlur);
  }
  window.addEventListener('popstate', onPopState);
}