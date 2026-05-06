import { initMobileEmojiPicker } from './EmojiPicker.js';

let isOpen = false;
let container = null;
let isClosing = false;
let ignoreFocusOnce = false;
let isInserting = false;

function isMobileLayout() {
  return window.innerWidth <= 800 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function freezeAndInsert() {
  if (!container || isInserting) return;
  isInserting = true;
  ignoreFocusOnce = true;
  container.style.height = `${container.scrollHeight}px`;
  container.style.overflow = 'hidden';
  setTimeout(() => {
    container.style.height = '';
    container.style.overflow = '';
    isInserting = false;
    ignoreFocusOnce = false;
    const messages = document.getElementById('messages');
    if (messages && typeof window.updateButtonVisibility === 'function') {
      window.updateButtonVisibility();
    }
  }, 60);
}

function animateOpen() {
  if (!container) return;
  container.style.display = 'block';
  container.style.transform = 'translateY(100%)';
  container.style.transition = 'none';
  requestAnimationFrame(() => {
    container.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
    container.style.transform = 'translateY(0)';
  });
}

function animateClose() {
  if (!container) return;
  container.style.transition = 'transform 0.2s ease';
  container.style.transform = 'translateY(100%)';
  setTimeout(() => {
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
      container.classList.remove('open');
    }
    isOpen = false;
    isClosing = false;
    if (window.history.state && window.history.state.pickerOpen) {
      window.history.back();
    }
  }, 200);
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
      container.style.display = 'block';
      container.style.transform = 'translateY(100%)';
      initMobileEmojiPicker(container, freezeAndInsert);
      isOpen = true;
      requestAnimationFrame(() => animateOpen());
      if (!window.history.state || !window.history.state.pickerOpen) {
        window.history.pushState({ pickerOpen: true }, '');
      }
    }, 50);
    return;
  }
  container.classList.add('open');
  container.style.display = 'block';
  container.style.transform = 'translateY(100%)';
  initMobileEmojiPicker(container, freezeAndInsert);
  isOpen = true;
  requestAnimationFrame(() => animateOpen());
  if (!window.history.state || !window.history.state.pickerOpen) {
    window.history.pushState({ pickerOpen: true }, '');
  }
}

function closePicker() {
  if (!isOpen || isClosing) return;
  if (!container) return;
  isClosing = true;
  animateClose();
}

function togglePicker() {
  if (isOpen) closePicker();
  else openPicker();
}

function onInputFocus() {
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
  const inputEl = document.getElementById('input');
  if (inputEl) {
    inputEl.addEventListener('focus', onInputFocus);
    inputEl.addEventListener('blur', onInputBlur);
  }
  window.addEventListener('popstate', onPopState);
}