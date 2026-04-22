const STORAGE_KEY = 'custom_emoji_categories';
const MAX_CATEGORIES = 4;
const MAX_EMOJIS_PER_CATEGORY = 30;

let categories = [];

export function loadCategories() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    categories = JSON.parse(saved);
  } else {
    categories = [
      { name: 'Favoritos', emojis: [] },
      { name: 'Logos', emojis: [] },
      { name: 'Animados', emojis: [] }
    ];
    saveCategories();
  }
  return categories;
}

function saveCategories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function getCategories() {
  if (categories.length === 0) loadCategories();
  return categories;
}

export function getAvailableCategoriesForNew() {
  return getCategories().map(c => c.name);
}

export function canCreateCategory() {
  return getCategories().length < MAX_CATEGORIES;
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
  if (!category) return false;
  return category.emojis.length < MAX_EMOJIS_PER_CATEGORY;
}

export function addCustomEmoji(emojiData, categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) {
    throw new Error('Categoría no encontrada');
  }
  if (category.emojis.length >= MAX_EMOJIS_PER_CATEGORY) {
    throw new Error(`Máximo ${MAX_EMOJIS_PER_CATEGORY} emojis por categoría`);
  }
  if (category.emojis.some(e => e.shortcodes[0] === emojiData.shortcodes[0])) {
    throw new Error('Ya existe un emoji con ese código');
  }
  category.emojis.push(emojiData);
  saveCategories();
  return categories;
}

export function removeCustomEmoji(categoryName, shortcode) {
  const category = getCategories().find(c => c.name === categoryName);
  if (category) {
    category.emojis = category.emojis.filter(e => e.shortcodes[0] !== shortcode);
    saveCategories();
  }
  return categories;
}

export function deleteCategory(categoryName) {
  categories = getCategories().filter(c => c.name !== categoryName);
  saveCategories();
  return categories;
}

export function getCustomEmojiArray() {
  const result = [];
  for (const category of getCategories()) {
    for (const emoji of category.emojis) {
      result.push({
        name: emoji.name,
        shortcodes: emoji.shortcodes,
        url: emoji.url,
        category: category.name
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