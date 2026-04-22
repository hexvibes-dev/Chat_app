import { EMOJI_CATEGORIES } from './EmojiData.js';

let activeCategory = 'smileys';
let onCategoryChange = null;

export function setActiveCategory(categoryKey) {
  activeCategory = categoryKey;
  if (onCategoryChange) {
    onCategoryChange(activeCategory);
  }
}

export function getActiveCategory() {
  return activeCategory;
}

export function onCategoryChangeCallback(callback) {
  onCategoryChange = callback;
}