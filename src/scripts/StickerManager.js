// src/scripts/StickerManager.js
const STORAGE_KEY = 'custom_stickers_categories';
const MAX_CATEGORIES = 4;
const MAX_STICKERS_PER_CATEGORY = 30;

let categories = [];

export function loadCategories() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    categories = JSON.parse(saved);
  } else {
    categories = [
      { name: 'Favoritos', stickers: [] },
      { name: 'Animados', stickers: [] }
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
  categories.push({ name: categoryName, stickers: [] });
  saveCategories();
  return categories;
}

export function canAddStickerToCategory(categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) return false;
  return category.stickers.length < MAX_STICKERS_PER_CATEGORY;
}

export function addCustomSticker(stickerData, categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) {
    throw new Error('Categoría no encontrada');
  }
  if (category.stickers.length >= MAX_STICKERS_PER_CATEGORY) {
    throw new Error(`Máximo ${MAX_STICKERS_PER_CATEGORY} stickers por categoría`);
  }
  if (category.stickers.some(s => s.id === stickerData.id)) {
    throw new Error('Ya existe un sticker con ese identificador');
  }
  category.stickers.push(stickerData);
  saveCategories();
  return categories;
}

export function removeCustomSticker(categoryName, stickerId) {
  const category = getCategories().find(c => c.name === categoryName);
  if (category) {
    category.stickers = category.stickers.filter(s => s.id !== stickerId);
    saveCategories();
  }
  return categories;
}

export function deleteCategory(categoryName) {
  categories = getCategories().filter(c => c.name !== categoryName);
  saveCategories();
  return categories;
}

export function getAllStickers() {
  const result = [];
  for (const category of getCategories()) {
    for (const sticker of category.stickers) {
      result.push({
        id: sticker.id,
        url: sticker.url,
        category: category.name
      });
    }
  }
  return result;
}

export function isStickerSaved(url) {
  return getAllStickers().some(s => s.url === url);
}

export function getStickerCategoryByUrl(url) {
  for (const category of getCategories()) {
    const found = category.stickers.find(s => s.url === url);
    if (found) return category.name;
  }
  return null;
}

export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      reject(new Error('El archivo debe ser una imagen o GIF'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function refreshStickersInPicker() {
  if (window._refreshStickers) {
    window._refreshStickers();
  }
}