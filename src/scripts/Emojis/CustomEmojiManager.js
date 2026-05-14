import { getStaticEmojiCategories } from './StaticEmojiCategories.js';

const STORAGE_KEY = 'custom_emoji_categories';
const DISABLED_STATIC_KEY = 'disabled_static_emoji_categories';
const MAX_CATEGORIES = 4;
const MAX_EMOJIS_PER_CATEGORY = 30;

let categories = [];
let disabledStaticCategories = [];

function loadDisabledStatic() {
  const saved = localStorage.getItem(DISABLED_STATIC_KEY);
  if (saved) {
    disabledStaticCategories = JSON.parse(saved);
  } else {
    disabledStaticCategories = [];
  }
}

function saveDisabledStatic() {
  localStorage.setItem(DISABLED_STATIC_KEY, JSON.stringify(disabledStaticCategories));
  window.dispatchEvent(new CustomEvent('custom-emojis-updated'));
}

export function isStaticCategoryDisabled(categoryName) {
  loadDisabledStatic();
  const result = disabledStaticCategories.includes(categoryName);
  return result;
}

export function toggleStaticCategoryDisabled(categoryName) {
  loadDisabledStatic();
  
  if (disabledStaticCategories.includes(categoryName)) {
    disabledStaticCategories = disabledStaticCategories.filter(c => c !== categoryName);
  } else {
    disabledStaticCategories.push(categoryName);
  }
  
  saveDisabledStatic();
  
  categories = [];
  loadCategories();
  
  if (window._refreshCustomEmojis) {
    window._refreshCustomEmojis();
  }
  
  return !disabledStaticCategories.includes(categoryName);
}

export function loadCategories() {
  loadDisabledStatic();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    categories = JSON.parse(saved);
  } else {
    categories = [
      { name: 'Favoritos', emojis: [] }
    ];
    saveCategories();
  }
  return categories;
}

function saveCategories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  window.dispatchEvent(new CustomEvent('custom-emojis-updated'));
}

export function getCategories() {
  if (categories.length === 0) loadCategories();
  const staticCats = getStaticEmojiCategories().map(cat => {
    const disabled = isStaticCategoryDisabled(cat.name);
    return {
      ...cat,
      isStaticCategory: true,
      isReadOnly: true,
      disabled: disabled
    };
  });
  const allCats = [...categories, ...staticCats];
  return allCats;
}

export function getAvailableCategoriesForNew() {
  return getCategories().filter(c => !c.isStaticCategory).map(c => c.name);
}

export function canCreateCategory() {
  return getCategories().filter(c => !c.isStaticCategory).length < MAX_CATEGORIES;
}

export function createCategory(categoryName) {
  if (!canCreateCategory()) {
    throw new Error(`Máximo ${MAX_CATEGORIES} categorías permitidas`);
  }
  if (getCategories().some(c => c.name === categoryName)) {
    throw new Error('La categoría ya existe');
  }
  categories.push({ name: categoryName, emojis: [] });
  saveCategories();
  return categories;
}

export function canAddEmojiToCategory(categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category || category.isStaticCategory || category.disabled) return false;
  return category.emojis.length < MAX_EMOJIS_PER_CATEGORY;
}

export function addCustomEmoji(emojiData, categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) throw new Error('Categoría no encontrada');
  if (category.isStaticCategory) throw new Error('No puedes añadir emojis a una categoría estática');
  if (category.disabled) throw new Error('Categoría desactivada');
  if (category.emojis.length >= MAX_EMOJIS_PER_CATEGORY) {
    throw new Error(`Máximo ${MAX_EMOJIS_PER_CATEGORY} emojis por categoría`);
  }
  if (category.emojis.some(e => e.shortcodes[0] === emojiData.shortcodes[0])) {
    throw new Error('Ya existe un emoji con ese código');
  }
  if (!emojiData.keywords) emojiData.keywords = [];
  category.emojis.push(emojiData);
  saveCategories();
  return categories;
}

export function removeCustomEmoji(categoryName, shortcode) {
  const category = getCategories().find(c => c.name === categoryName);
  if (category && !category.isStaticCategory) {
    category.emojis = category.emojis.filter(e => e.shortcodes[0] !== shortcode);
    saveCategories();
  }
  return categories;
}

export function deleteCategory(categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (category && !category.isStaticCategory) {
    categories = getCategories().filter(c => c.name !== categoryName && !c.isStaticCategory);
    saveCategories();
  }
  return categories;
}

export function getCustomEmojiArray() {
  const result = [];
  const allCategories = getCategories();
  
  for (const category of allCategories) {
    if (category.disabled) {
      continue;
    }
    for (const emoji of (category.emojis || [])) {
      result.push({
        name: emoji.name,
        shortcodes: emoji.shortcodes,
        url: emoji.url,
        svg: emoji.svg,
        category: category.name,
        keywords: emoji.keywords || [],
        animated: emoji.animated || false,
        animationType: emoji.animationType || null,
        duration: emoji.duration,
        iterations: emoji.iterations
      });
    }
  }
  return result;
}

export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo debe ser una imagen'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function refreshCustomEmojisInPicker() {
  if (window._refreshCustomEmojis) {
    window._refreshCustomEmojis();
  }
}

export function debugDisabledCategories() {
  loadDisabledStatic();
  return disabledStaticCategories;
}

export function debugAllCategories() {
  const allCats = getCategories();
  return allCats;
}

export function debugCustomEmojiArray() {
  const emojis = getCustomEmojiArray();
  return emojis;
}