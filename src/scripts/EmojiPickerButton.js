import { initMobileEmojiPicker } from './EmojiPicker.js';

let isOpen = false;
let container = null;
let isClosing = false;
let ignoreFocusOnce = false;
let isInserting = false;
let resizeObserver = null;
let lastAppliedY = null;
let pendingUpdate = false;

function isMobileLayout() {
  return window.innerWidth <= 800 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function getKeyboardHeight() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height);
}

function updateKeyboardVariable(height) {
  document.documentElement.style.setProperty('--keyboard', `${height}px`);
  window.dispatchEvent(new CustomEvent('keyboardchange', { detail: { keyboard: height, isOpen: height > 80 } }));
}

function setInputTransform(y, instant = false) {
  const layerInput = document.querySelector('.layer-input');
  if (!layerInput) return;
  if (lastAppliedY === y) return;
  lastAppliedY = y;
  if (instant) {
    layerInput.style.transition = 'none';
    layerInput.style.transform = `translateY(${y}px)`;
    layerInput.offsetHeight;
    layerInput.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
  } else {
    layerInput.style.transform = `translateY(${y}px)`;
  }
}

function updateInputPosition(instant = false) {
  if (isInserting) return;
  if (pendingUpdate) return;
  pendingUpdate = true;
  requestAnimationFrame(() => {
    const keyboardHeight = getKeyboardHeight();
    const layerInput = document.querySelector('.layer-input');
    const inputHeight = layerInput ? layerInput.offsetHeight : 60;
    const maxTranslate = window.innerHeight - inputHeight;
    let translateY = 0;
    if (isOpen && container) {
      updateKeyboardVariable(container.scrollHeight);
      translateY = 0;
    } else if (keyboardHeight > 0) {
      updateKeyboardVariable(keyboardHeight);
      translateY = Math.max(-keyboardHeight, -maxTranslate);
    } else {
      updateKeyboardVariable(0);
      translateY = 0;
    }
    setInputTransform(translateY, instant);
    pendingUpdate = false;
  });
}

function freezeAndInsert() {
  if (!container || isInserting) return;
  isInserting = true;
  ignoreFocusOnce = true;
  if (resizeObserver) resizeObserver.disconnect();
  const pickerHeight = container.scrollHeight;
  container.style.height = `${pickerHeight}px`;
  container.style.overflow = 'hidden';
  container.style.transition = 'none';
  setTimeout(() => {
    container.style.height = '';
    container.style.overflow = '';
    container.style.transition = '';
    isInserting = false;
    ignoreFocusOnce = false;
    if (resizeObserver && container) resizeObserver.observe(container);
    updateInputPosition(false);
    const messages = document.getElementById('messages');
    if (messages && typeof window.updateButtonVisibility === 'function') {
      window.updateButtonVisibility();
    }
  }, 60);
}

function animateOpen() {
  if (!container) return;
  container.style.display = 'block';
  container.style.opacity = '0';
  container.style.transform = 'translateY(20px)';
  container.style.transition = 'none';
  requestAnimationFrame(() => {
    container.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1), opacity 0.2s ease';
    container.style.transform = 'translateY(0)';
    container.style.opacity = '1';
    updateInputPosition(false);
  });
}

function animateClose() {
  if (!container) return;
  container.style.transition = 'transform 0.2s ease, opacity 0.15s ease';
  container.style.transform = 'translateY(20px)';
  container.style.opacity = '0';
  setTimeout(() => {
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
      container.classList.remove('open');
    }
    isOpen = false;
    isClosing = false;
    updateInputPosition(false);
    if (window.history.state && window.history.state.pickerOpen) {
      window.history.back();
    }
  }, 200);
}

function openPicker() {
  if (isOpen || isClosing) return;
  container = document.getElementById('mobile-picker-container');
  if (!container) return;
  const input = document.getElementById('input');
  if (input && document.activeElement === input) {
    input.blur();
    setTimeout(() => {
      container.innerHTML = '';
      container.classList.add('open');
      container.style.display = 'none';
      initMobileEmojiPicker(container, freezeAndInsert);
      isOpen = true;
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (isOpen && container && !isInserting) {
            updateInputPosition(false);
          }
        });
      }
      resizeObserver.observe(container);
      requestAnimationFrame(() => animateOpen());
      if (!window.history.state || !window.history.state.pickerOpen) {
        window.history.pushState({ pickerOpen: true }, '');
      }
    }, 50);
    return;
  }
  container.innerHTML = '';
  container.classList.add('open');
  container.style.display = 'none';
  initMobileEmojiPicker(container, freezeAndInsert);
  isOpen = true;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      if (isOpen && container && !isInserting) {
        updateInputPosition(false);
      }
    });
  }
  resizeObserver.observe(container);
  requestAnimationFrame(() => animateOpen());
  if (getKeyboardHeight() === 0) {
    updateInputPosition(false);
  }
  if (!window.history.state || !window.history.state.pickerOpen) {
    window.history.pushState({ pickerOpen: true }, '');
  }
}

function closePicker() {
  if (!isOpen || isClosing) return;
  if (!container) return;
  isClosing = true;
  if (resizeObserver) resizeObserver.disconnect();
  animateClose();
}

function togglePicker() {
  if (isOpen) closePicker();
  else openPicker();
}

function onKeyboardChange() {
  if (!isOpen && !isInserting) updateInputPosition(false);
}

function onInputFocus() {
  if (isOpen && !ignoreFocusOnce) closePicker();
}

function onInputBlur() {
  if (window._ignoreBlurForPicker) return;
  setTimeout(() => updateInputPosition(false), 50);
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
  const input = document.getElementById('input');
  if (input) {
    input.addEventListener('focus', onInputFocus);
    input.addEventListener('blur', onInputBlur);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onKeyboardChange);
    window.visualViewport.addEventListener('scroll', onKeyboardChange);
  }
  window.addEventListener('resize', onKeyboardChange);
  window.addEventListener('popstate', onPopState);
  const layerInput = document.querySelector('.layer-input');
  if (layerInput) {
    layerInput.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
    layerInput.style.willChange = 'transform';
  }
  updateInputPosition(true);
}