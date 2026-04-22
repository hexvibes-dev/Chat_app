import { initEmojiPicker, destroyEmojiPicker } from './EmojiPicker/EmojiPickerCore.js';
import { initStickersPicker, destroyStickersPicker } from './StickersPicker.js';
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
          insertAtCursor(emoji, window.keyboardOpen);
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
        insertAtCursor(text, window.keyboardOpen);
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