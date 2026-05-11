import { getCustomEmojiArray } from '../Emojis/CustomEmojiManager.js';
import { customEmojiCollection } from '../Emojis/CustomEmojiPicker.js';
import { getNativeEmojiExtraKeywords } from './NativeEmojiKeywords.js';
import { getAllLocalStickers } from '../Stickers/CustomSticker.js';
import { getStickerHtml } from '../Stickers/StickersPicker.js';
import { appendMessage } from './messages.js';
import { insertAtCursor } from './input.js';
import emojis from 'unicode-emoji-json';
import { getStaticEmojiCategories } from '../Emojis/StaticEmojiCategories.js';
import { isStaticCategoryDisabled } from '../Emojis/CustomEmojiManager.js';

let suggestionContainer = null;
let currentSuggestions = [];
let activeIndex = -1;
let debounceTimer = null;
let inputElement = null;
let isInserting = false;

const nativeEmojiIndex = new Map();
const NATIVE_EMOJI_EXTRA_KEYWORDS = getNativeEmojiExtraKeywords();

function buildNativeIndex() {
  nativeEmojiIndex.clear();
  for (const [emoji, data] of Object.entries(emojis)) {
    const name = data.name.toLowerCase();
    const keywords = new Set();
    keywords.add(name);
    const words = name.split(' ');
    for (const word of words) {
      if (word.length >= 3) keywords.add(word);
    }
    const emojiWithoutSkin = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
    keywords.add(emojiWithoutSkin);
    
    if (NATIVE_EMOJI_EXTRA_KEYWORDS[emoji]) {
      for (const extraKeyword of NATIVE_EMOJI_EXTRA_KEYWORDS[emoji]) {
        keywords.add(extraKeyword);
      }
    }
    
    for (const keyword of keywords) {
      if (!nativeEmojiIndex.has(keyword)) {
        nativeEmojiIndex.set(keyword, []);
      }
      const existing = nativeEmojiIndex.get(keyword);
      if (!existing.some(e => e.emoji === emoji)) {
        existing.push({ emoji, type: 'native' });
      }
    }
  }
}

let customEmojiKeywords = new Map();

function refreshCustomKeywords() {
  customEmojiKeywords.clear();
  const customEmojis = getCustomEmojiArray();
  
  const staticEmojis = customEmojiCollection.map(e => ({
    name: e.name,
    shortcodes: e.shortcodes,
    url: e.url,
    svg: e.svg,
    category: e.category,
    keywords: e.keywords || [],
    animated: e.animated || false,
    animationType: e.animationType || null,
    duration: e.duration || 2000,
    iterations: e.iterations || 1
  }));
  
  const dynamicEmojis = customEmojis.map(e => ({
    name: e.name,
    shortcodes: e.shortcodes,
    url: e.url,
    svg: e.svg,
    category: e.category,
    keywords: e.keywords || [],
    animated: e.animated || false,
    animationType: e.animationType || null,
    duration: e.duration || 2000,
    iterations: e.iterations || 1
  }));
  
  window._customEmojiData = [...staticEmojis, ...dynamicEmojis];
  
  const localStickers = getAllLocalStickers();
  for (const sticker of localStickers) {
    const keywords = sticker.keywords || [];
    if (sticker.name) keywords.push(sticker.name);
    
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      if (!customEmojiKeywords.has(lowerKw)) customEmojiKeywords.set(lowerKw, []);
      const existing = customEmojiKeywords.get(lowerKw);
      if (!existing.some(e => e.id === sticker.id)) {
        existing.push({
          id: sticker.id,
          url: sticker.url,
          name: sticker.name,
          type: 'sticker',
          animated: sticker.animated || false,
          animationType: sticker.animationType || null,
          duration: sticker.duration,
          iterations: sticker.iterations,
          stickerData: sticker
        });
      }
    }
  }
  
  const staticCategories = getStaticEmojiCategories();
  for (const cat of staticCategories) {
    if (isStaticCategoryDisabled(cat.name)) continue;
    for (const emoji of cat.emojis) {
      const shortcode = emoji.shortcodes[0];
      const keywords = emoji.keywords || [];
      for (const kw of keywords) {
        const lowerKw = kw.toLowerCase();
        if (!customEmojiKeywords.has(lowerKw)) customEmojiKeywords.set(lowerKw, []);
        const existing = customEmojiKeywords.get(lowerKw);
        if (!existing.some(e => e.shortcode === shortcode)) {
          existing.push({
            shortcode,
            url: emoji.url,
            svg: emoji.svg,
            name: emoji.name,
            type: 'custom',
            animated: emoji.animated,
            animationType: emoji.animationType,
            duration: emoji.duration,
            iterations: emoji.iterations
          });
        }
      }
      customEmojiKeywords.set(shortcode, [{
        shortcode,
        url: emoji.url,
        svg: emoji.svg,
        name: emoji.name,
        type: 'custom',
        animated: emoji.animated,
        animationType: emoji.animationType,
        duration: emoji.duration,
        iterations: emoji.iterations
      }]);
    }
  }
  
  for (const custom of staticEmojis) {
    const shortcode = custom.shortcodes[0];
    const keywords = custom.keywords || [];
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      if (!customEmojiKeywords.has(lowerKw)) customEmojiKeywords.set(lowerKw, []);
      const existing = customEmojiKeywords.get(lowerKw);
      if (!existing.some(e => e.shortcode === shortcode)) {
        existing.push({
          shortcode,
          url: custom.url,
          svg: custom.svg,
          name: custom.name,
          type: 'custom',
          animated: custom.animated,
          animationType: custom.animationType,
          duration: custom.duration,
          iterations: custom.iterations
        });
      }
    }
    customEmojiKeywords.set(shortcode, [{
      shortcode,
      url: custom.url,
      svg: custom.svg,
      name: custom.name,
      type: 'custom',
      animated: custom.animated,
      animationType: custom.animationType,
      duration: custom.duration,
      iterations: custom.iterations
    }]);
  }
  
  for (const custom of dynamicEmojis) {
    const shortcode = custom.shortcodes[0];
    const keywords = custom.keywords || [];
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      if (!customEmojiKeywords.has(lowerKw)) customEmojiKeywords.set(lowerKw, []);
      const existing = customEmojiKeywords.get(lowerKw);
      if (!existing.some(e => e.shortcode === shortcode)) {
        existing.push({
          shortcode,
          url: custom.url,
          svg: custom.svg,
          name: custom.name,
          type: 'custom',
          animated: custom.animated,
          animationType: custom.animationType,
          duration: custom.duration,
          iterations: custom.iterations
        });
      }
    }
    customEmojiKeywords.set(shortcode, [{
      shortcode,
      url: custom.url,
      svg: custom.svg,
      name: custom.name,
      type: 'custom',
      animated: custom.animated,
      animationType: custom.animationType,
      duration: custom.duration,
      iterations: custom.iterations
    }]);
  }
}

function getSuggestions(query) {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  const results = [];
  const seen = new Set();
  
  for (const [keyword, items] of nativeEmojiIndex.entries()) {
    if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) {
      for (const item of items) {
        const key = `native_${item.emoji}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }
  }
  
  for (const [keyword, items] of customEmojiKeywords.entries()) {
    if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) {
      for (const item of items) {
        const key = `${item.type}_${item.shortcode || item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }
  }
  
  return results.slice(0, 8);
}

function getInputElementRect() {
  const layerInput = document.getElementById('layerInput');
  if (layerInput) {
    const inputContainer = layerInput.querySelector('.input-container') || layerInput;
    return inputContainer.getBoundingClientRect();
  }
  if (inputElement) return inputElement.getBoundingClientRect();
  return null;
}

function getKeyboardHeight() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
}

function getPickerHeight() {
  const container = document.getElementById('mobile-picker-container');
  if (!container || !container.classList.contains('open')) return 0;
  return 400;
}

function getEffectiveBottomOffset() {
  return getKeyboardHeight() + getPickerHeight();
}

function updatePopupPosition() {
  if (!suggestionContainer) return;
  const inputRect = getInputElementRect();
  if (!inputRect) return;
  const effectiveBottomOffset = getEffectiveBottomOffset();
  const baseBottom = 60;
  const totalOffset = baseBottom + effectiveBottomOffset;
  const topPosition = inputRect.top - 10;
  const bottomPosition = totalOffset + 10;
  
  if (topPosition > 0 && effectiveBottomOffset > 0) {
    suggestionContainer.style.bottom = 'auto';
    suggestionContainer.style.top = (topPosition - 50) + 'px';
  } else {
    suggestionContainer.style.top = 'auto';
    suggestionContainer.style.bottom = bottomPosition + 'px';
  }
  suggestionContainer.style.left = inputRect.left + 'px';
  suggestionContainer.style.right = 'auto';
}

function createSuggestionContainer() {
  if (suggestionContainer) return;
  suggestionContainer = document.createElement('div');
  suggestionContainer.className = 'emoji-suggestions-container';
  document.body.appendChild(suggestionContainer);
}

function deleteCurrentWord() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;
  
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;
  
  if (node.nodeType === Node.TEXT_NODE) {
    const textBefore = node.textContent.slice(0, offset);
    const match = textBefore.match(/(\S+)$/);
    if (match) {
      const start = offset - match[0].length;
      range.setStart(node, start);
      range.setEnd(node, offset);
      range.deleteContents();
      return true;
    } else {
      const spaceMatch = textBefore.match(/\s+$/);
      if (spaceMatch) {
        const start = offset - spaceMatch[0].length;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();
        return true;
      }
    }
  }
  return false;
}

function insertStickerAndSend(sticker) {
  if (isInserting) return;
  isInserting = true;
  
  deleteCurrentWord();
  
  const stickerHtml = getStickerHtml(sticker);
  appendMessage(stickerHtml, { me: true });
  
  setTimeout(() => {
    isInserting = false;
  }, 200);
}

function renderSuggestions(suggestions) {
  if (!suggestionContainer) createSuggestionContainer();
  
  suggestionContainer.innerHTML = '';
  
  if (!suggestions.length) {
    suggestionContainer.style.display = 'none';
    return;
  }
  
  suggestionContainer.style.display = 'flex';
  
  for (let idx = 0; idx < suggestions.length; idx++) {
    const item = suggestions[idx];
    const btn = document.createElement('button');
    btn.className = 'emoji-suggestion-item';
    btn.setAttribute('data-index', idx);
    
    if (item.type === 'native') {
      btn.textContent = item.emoji;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertSuggestion(item.emoji);
        hideSuggestions();
      });
    } else if (item.type === 'sticker') {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.name || 'sticker';
      img.style.width = '32px';
      img.style.height = '32px';
      img.style.objectFit = 'contain';
      btn.appendChild(img);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertStickerAndSend(item.stickerData);
        hideSuggestions();
      });
    } else {
      if (item.svg) {
        const wrapper = document.createElement('div');
        wrapper.style.width = '32px';
        wrapper.style.height = '32px';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.innerHTML = item.svg;
        btn.appendChild(wrapper);
      } else if (item.url) {
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.shortcode;
        img.style.width = '32px';
        img.style.height = '32px';
        img.style.objectFit = 'contain';
        btn.appendChild(img);
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertSuggestion(`:${item.shortcode}:`);
        hideSuggestions();
      });
    }
    
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.background = 'rgba(20, 184, 166, 0.9)';
      btn.style.borderColor = 'rgba(20, 184, 166, 0.8)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = 'rgba(30, 30, 46, 0.85)';
      btn.style.borderColor = 'rgba(58, 58, 74, 0.5)';
    });
    
    suggestionContainer.appendChild(btn);
  }
  
  updatePopupPosition();
}

function highlightSuggestion(index) {
  const items = suggestionContainer.querySelectorAll('.emoji-suggestion-item');
  items.forEach((item, i) => {
    if (i === index) {
      item.style.transform = 'scale(1.1)';
      item.style.background = 'rgba(20, 184, 166, 0.9)';
      item.style.borderColor = 'rgba(20, 184, 166, 0.8)';
    } else {
      item.style.transform = 'scale(1)';
      item.style.background = 'rgba(30, 30, 46, 0.85)';
      item.style.borderColor = 'rgba(58, 58, 74, 0.5)';
    }
  });
}

function insertSuggestion(text) {
  if (!inputElement) return;
  
  const wasFocused = document.activeElement === inputElement;
  
  deleteCurrentWord();
  
  insertAtCursor(text, true);
  
  if (wasFocused) {
    setTimeout(() => inputElement.focus(), 0);
  }
}

function hideSuggestions() {
  if (!suggestionContainer) return;
  suggestionContainer.style.display = 'none';
  suggestionContainer.innerHTML = '';
  currentSuggestions = [];
  activeIndex = -1;
}

function getCurrentWord() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return '';
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;
  
  if (node.nodeType === Node.TEXT_NODE) {
    const textBeforeCursor = node.textContent.slice(0, offset);
    const match = textBeforeCursor.match(/[a-zA-Z\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF\u0400-\u04FF\u0500-\u052F\u0370-\u03FF\u1F00-\u1FFF]+$/);
    return match ? match[0] : '';
  }
  return '';
}

function onInputChange() {
  const currentWord = getCurrentWord();
  if (currentWord.length < 2) {
    hideSuggestions();
    return;
  }
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const suggestions = getSuggestions(currentWord);
    currentSuggestions = suggestions;
    if (suggestions.length) {
      renderSuggestions(suggestions);
    } else {
      hideSuggestions();
    }
  }, 80);
}

function onKeyDown(e) {
  if (!suggestionContainer || suggestionContainer.style.display !== 'flex') return;
  if (suggestionContainer.children.length === 0) return;
  
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % suggestionContainer.children.length;
    highlightSuggestion(activeIndex);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + suggestionContainer.children.length) % suggestionContainer.children.length;
    highlightSuggestion(activeIndex);
  } else if (e.key === 'Enter' && activeIndex >= 0 && suggestionContainer.children[activeIndex]) {
    e.preventDefault();
    const btn = suggestionContainer.children[activeIndex];
    btn.click();
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
}

function onResizeOrScroll() {
  if (suggestionContainer && suggestionContainer.style.display === 'flex') {
    updatePopupPosition();
  }
}

function onKeyboardChange() {
  if (suggestionContainer && suggestionContainer.style.display === 'flex') {
    setTimeout(() => updatePopupPosition(), 50);
  }
}

function findEditableInput() {
  const layerInput = document.getElementById('layerInput');
  if (layerInput) {
    const editable = layerInput.querySelector('[contenteditable="true"]');
    if (editable) return editable;
  }
  return document.getElementById('input');
}

export function initEmojiSuggestions() {
  inputElement = findEditableInput();
  if (!inputElement) return;
  buildNativeIndex();
  refreshCustomKeywords();
  createSuggestionContainer();
  inputElement.addEventListener('input', onInputChange);
  inputElement.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResizeOrScroll);
  window.addEventListener('scroll', onResizeOrScroll);
  window.addEventListener('keyboardchange', onKeyboardChange);
  window.addEventListener('picker-opened', onKeyboardChange);
  window.addEventListener('picker-closed', onKeyboardChange);
  
  const resizeObserver = new ResizeObserver(() => onResizeOrScroll());
  resizeObserver.observe(inputElement);
  const layerInput = document.getElementById('layerInput');
  if (layerInput) resizeObserver.observe(layerInput);
}

export function refreshEmojiKeywords() {
  refreshCustomKeywords();
}

window.addEventListener('custom-emojis-updated', () => {
  refreshEmojiKeywords();
});
window.addEventListener('stickers-updated', () => {
  refreshEmojiKeywords();
});