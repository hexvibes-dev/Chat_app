import { initEmojiPicker, destroyEmojiPicker } from './EmojiPicker/EmojiPickerCore.js';
import { initStickersPicker, destroyStickersPicker, refreshStickersDisplay } from './StickersPicker.js';
import { initGifsPicker, destroyGifsPicker } from './GifsPicker.js';
import { insertAtCursor } from './input.js';
import { appendMessage } from './messages.js';

let currentTab = 'emojis';
let stickersContainer = null;
let gifsContainer = null;
let emojiPickerInstance = null;
let currentEmojiContainer = null;

function preserveInputFocus() {
  const input = document.getElementById('input');
  const wasFocused = input && document.activeElement === input;
  return { wasFocused, input };
}

function restoreInputFocus(wasFocused, input) {
  if (wasFocused && input) {
    input.focus({ preventScroll: true });
  }
}

export async function showEmojiPicker(container, onOpen) {
  if (!container) return;
  
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const tabs = document.createElement('div');
  tabs.className = 'emoji-picker-tabs';
  tabs.innerHTML = `
    <button class="tab-btn active" data-tab="emojis">😀 Emojis</button>
    <button class="tab-btn" data-tab="stickers">🖼️ Stickers</button>
    <button class="tab-btn" data-tab="gifs">🎥 GIFs</button>
  `;
  container.appendChild(tabs);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'emoji-picker-content';
  contentDiv.style.cssText = 'flex:1;min-height:0;position:relative;display:flex;flex-direction:column;overflow:hidden;';
  container.appendChild(contentDiv);

  function switchTab(tabId) {
    const focusState = preserveInputFocus();
    currentTab = tabId;
    contentDiv.innerHTML = '';
    
    tabs.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (tabId === 'emojis') {
      if (emojiPickerInstance) {
        destroyEmojiPicker();
        emojiPickerInstance = null;
      }
      currentEmojiContainer = document.createElement('div');
      currentEmojiContainer.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
      contentDiv.appendChild(currentEmojiContainer);
      emojiPickerInstance = initEmojiPicker(currentEmojiContainer, (emoji) => {
        setTimeout(() => {
          insertAtCursor(emoji, false);
        }, 0);
      });
    } else if (tabId === 'stickers') {
      if (emojiPickerInstance) {
        destroyEmojiPicker();
        emojiPickerInstance = null;
      }
      stickersContainer = document.createElement('div');
      stickersContainer.id = 'stickers-picker-container';
      stickersContainer.style.height = '100%';
      stickersContainer.style.overflow = 'auto';
      contentDiv.appendChild(stickersContainer);
      initStickersPicker(stickersContainer, (stickerHtml) => {
        appendMessage(stickerHtml, { me: true });
        if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') {
          window.smoothScrollToBottom();
        }
      });
    } else if (tabId === 'gifs') {
      if (emojiPickerInstance) {
        destroyEmojiPicker();
        emojiPickerInstance = null;
      }
      gifsContainer = document.createElement('div');
      gifsContainer.id = 'gifs-picker-container';
      gifsContainer.style.height = '100%';
      gifsContainer.style.overflow = 'auto';
      contentDiv.appendChild(gifsContainer);
      initGifsPicker(gifsContainer, (text) => {
        insertAtCursor(text, false);
      });
    }
    
    restoreInputFocus(focusState.wasFocused, focusState.input);
  }

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn && btn.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });
  
  tabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
  });

  switchTab('emojis');
  if (onOpen) onOpen();
}

export function hideEmojiPicker(container) {
  if (emojiPickerInstance) {
    destroyEmojiPicker();
    emojiPickerInstance = null;
  }
  if (stickersContainer) destroyStickersPicker();
  if (gifsContainer) destroyGifsPicker();
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  currentEmojiContainer = null;
}

export async function initMobileEmojiPicker(container, onInsertStart) {
  if (!container) return;
  
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '400px';
  container.style.width = '100%';
  container.style.maxWidth = '100vw';
  container.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.className = 'emoji-mobile-header';
  header.style.cssText = 'flex-shrink:0; height:48px; min-height:48px; max-height:48px; padding:0 12px; border-bottom:1px solid var(--modal-input-border); background: var(--modal-bg); display:flex; align-items:center;';
  header.innerHTML = '<div class="emoji-categories-placeholder"></div>';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'emoji-mobile-body';
  body.style.cssText = 'flex:1; min-height:0; overflow-y: auto; padding:8px 0;';
  container.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'emoji-mobile-footer';
  footer.style.cssText = 'flex-shrink:0; height:52px; min-height:52px; max-height:52px; display:flex; border-top:1px solid var(--modal-input-border); background: var(--modal-bg); padding:0 12px; gap:8px; align-items:center;';
  footer.innerHTML = `
    <button class="mobile-tab-btn active" data-tab="emojis" style="flex:1; background:transparent; border:none; padding:8px; font-size:15px; cursor:pointer; color:var(--modal-text); border-radius:12px; height:36px; display:flex; align-items:center; justify-content:center;">😀 Emojis</button>
    <button class="mobile-tab-btn" data-tab="stickers" style="flex:1; background:transparent; border:none; padding:8px; font-size:15px; cursor:pointer; color:var(--modal-text); border-radius:12px; height:36px; display:flex; align-items:center; justify-content:center;">🖼️ Stickers</button>
    <button class="mobile-tab-btn" data-tab="gifs" style="flex:1; background:transparent; border:none; padding:8px; font-size:15px; cursor:pointer; color:var(--modal-text); border-radius:12px; height:36px; display:flex; align-items:center; justify-content:center;">🎥 GIFs</button>
  `;
  container.appendChild(footer);

  let currentMobileTab = 'emojis';
  let stickerPickerInstance = null;
  let gifsPickerInstance = null;
  let mobileEmojiPicker = null;

  function setActiveTab(tabId) {
    currentMobileTab = tabId;
    footer.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    body.innerHTML = '';
    if (tabId === 'emojis') {
      const emojiContainer = document.createElement('div');
      emojiContainer.style.height = '100%';
      body.appendChild(emojiContainer);
      if (mobileEmojiPicker) {
        destroyEmojiPicker();
        mobileEmojiPicker = null;
      }
      mobileEmojiPicker = initEmojiPicker(emojiContainer, (emoji) => {
        if (onInsertStart) onInsertStart();
        insertAtCursor(emoji, false);
      });
    } else if (tabId === 'stickers') {
      if (stickerPickerInstance) {
        stickerPickerInstance = null;
      }
      const stickerContainer = document.createElement('div');
      stickerContainer.style.height = '100%';
      body.appendChild(stickerContainer);
      initStickersPicker(stickerContainer, (stickerHtml) => {
        if (onInsertStart) onInsertStart();
        appendMessage(stickerHtml, { me: true });
        if (window.isAtBottom && typeof window.smoothScrollToBottom === 'function') {
          window.smoothScrollToBottom();
        }
      });
      stickerPickerInstance = stickerContainer;
    } else if (tabId === 'gifs') {
      if (gifsPickerInstance) {
        gifsPickerInstance = null;
      }
      const gifContainer = document.createElement('div');
      gifContainer.style.height = '100%';
      body.appendChild(gifContainer);
      initGifsPicker(gifContainer, (text) => {
        if (onInsertStart) onInsertStart();
        insertAtCursor(text, false);
      });
      gifsPickerInstance = gifContainer;
    }
  }

  footer.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.dataset.tab;
      if (tab) setActiveTab(tab);
    });
    btn.addEventListener('mousedown', (e) => e.preventDefault());
  });

  setActiveTab('emojis');

  setTimeout(() => {
    if (mobileEmojiPicker && mobileEmojiPicker.recentEmojis) {
      mobileEmojiPicker.recentEmojis = [...mobileEmojiPicker.recentEmojis];
    }
    const emojiContainer = body.querySelector('.emoji-picker-content');
    if (emojiContainer && emojiContainer.recentEmojis) {
      emojiContainer.recentEmojis = [...emojiContainer.recentEmojis];
    }
  }, 100);
}