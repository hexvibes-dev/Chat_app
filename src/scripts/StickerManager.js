import { getLocalStickerCategories, getAllLocalStickers } from './CustomSticker.js';

const STORAGE_KEY = 'custom_stickers_categories';
const DISABLED_CATEGORIES_KEY = 'disabled_sticker_categories';
const MAX_CATEGORIES = 4;
const MAX_STICKERS_PER_CATEGORY = 30;

let categories = [];
let disabledCategories = [];

export function loadDisabledCategories() {
  const saved = localStorage.getItem(DISABLED_CATEGORIES_KEY);
  if (saved) {
    disabledCategories = JSON.parse(saved);
  } else {
    disabledCategories = [];
  }
  return disabledCategories;
}

function saveDisabledCategories() {
  localStorage.setItem(DISABLED_CATEGORIES_KEY, JSON.stringify(disabledCategories));
  window.dispatchEvent(new CustomEvent('stickers-updated'));
}

export function isCategoryDisabled(categoryName) {
  return disabledCategories.includes(categoryName);
}

export function toggleCategoryDisabled(categoryName) {
  if (disabledCategories.includes(categoryName)) {
    disabledCategories = disabledCategories.filter(c => c !== categoryName);
  } else {
    disabledCategories.push(categoryName);
  }
  saveDisabledCategories();
  loadCategories(); // Recargar categorías para actualizar la UI
  return !disabledCategories.includes(categoryName);
}

export function loadCategories() {
  loadDisabledCategories();
  
  const saved = localStorage.getItem(STORAGE_KEY);
  let userCategories = [];
  if (saved) {
    userCategories = JSON.parse(saved);
  } else {
    userCategories = [
      { name: 'Favoritos', stickers: [] },
      { name: 'Animados', stickers: [] }
    ];
    saveUserCategories(userCategories);
  }

  const localCats = getLocalStickerCategories();
  
  const readonlyLocalCats = localCats.map(cat => ({
    name: cat.name,
    stickers: cat.stickers.map(s => ({
      id: s.id,
      url: s.url,
      name: s.name,
      animated: s.animated || false,
      animationType: s.animationType || null,
      duration: s.duration,
      iterations: s.iterations,
      isLocal: true,
      keywords: s.keywords || []
    })),
    isLocalCategory: true,
    isReadOnly: true,
    order: cat.order || 999,
    disabled: isCategoryDisabled(cat.name)
  }));

  categories = [...userCategories, ...readonlyLocalCats];
  
  return categories;
}

function saveUserCategories(userCats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userCats));
  window.dispatchEvent(new CustomEvent('stickers-updated'));
}

function saveCategories() {
  const userCats = categories.filter(c => !c.isLocalCategory);
  saveUserCategories(userCats);
}

export function getCategories() {
  if (categories.length === 0) loadCategories();
  return categories;
}

export function getAvailableCategoriesForNew() {
  return getCategories().filter(c => !c.isLocalCategory && !c.disabled).map(c => c.name);
}

export function canCreateCategory() {
  return getCategories().filter(c => !c.isLocalCategory).length < MAX_CATEGORIES;
}

export function createCategory(categoryName) {
  if (!canCreateCategory()) {
    throw new Error(`Máximo ${MAX_CATEGORIES} categorías permitidas`);
  }
  if (getCategories().some(c => c.name === categoryName)) {
    throw new Error('La categoría ya existe');
  }
  const newCat = { name: categoryName, stickers: [] };
  categories.push(newCat);
  saveCategories();
  return categories;
}

export function canAddStickerToCategory(categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category || category.isLocalCategory || category.disabled) return false;
  return category.stickers.length < MAX_STICKERS_PER_CATEGORY;
}

export function addCustomSticker(stickerData, categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) throw new Error('Categoría no encontrada');
  if (category.isLocalCategory) throw new Error('No puedes añadir stickers a una categoría de solo lectura');
  if (category.disabled) throw new Error('No puedes añadir stickers a una categoría desactivada');
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
  if (category && !category.isLocalCategory) {
    category.stickers = category.stickers.filter(s => s.id !== stickerId);
    saveCategories();
  }
  return categories;
}

export function deleteCategory(categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (category && !category.isLocalCategory) {
    categories = getCategories().filter(c => c.name !== categoryName);
    saveCategories();
  }
  return categories;
}

export function getAllStickers() {
  const result = [];
  for (const category of getCategories()) {
    if (category.disabled) continue;
    for (const sticker of category.stickers) {
      result.push({
        id: sticker.id,
        url: sticker.url,
        category: category.name,
        name: sticker.name,
        animated: sticker.animated || false,
        animationType: sticker.animationType || null,
        isLocal: sticker.isLocal || false,
        keywords: sticker.keywords || []
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