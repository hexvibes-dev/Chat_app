// src/scripts/editor/EmojiRecent.js

import { getRecentEmojis, addRecentEmoji, RECENT_STORAGE_KEY } from './EmojiData.js';

let recentEmojis = [];
let onRecentUpdate = null;

export function loadRecentEmojis() {
  recentEmojis = getRecentEmojis();
  return recentEmojis;
}

export function updateRecentEmojis(emoji) {
  recentEmojis = addRecentEmoji(emoji);
  if (onRecentUpdate) {
    onRecentUpdate(recentEmojis);
  }
  return recentEmojis;
}

export function onRecentUpdateCallback(callback) {
  onRecentUpdate = callback;
}

export function getRecentEmojisList() {
  return recentEmojis;
}

export function clearRecentEmojis() {
  localStorage.removeItem(RECENT_STORAGE_KEY);
  recentEmojis = [];
  if (onRecentUpdate) {
    onRecentUpdate(recentEmojis);
  }
}