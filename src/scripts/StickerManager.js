// src/scripts/StickerManager.js

import { getLocalStickerCategories, getAllLocalStickers } from './CustomSticker.js';

const STORAGE_KEY = 'custom_stickers_categories';
const MAX_CATEGORIES = 4;          // solo para categorías del usuario
const MAX_STICKERS_PER_CATEGORY = 30;

let categories = [];

// Cargar todas las categorías (locales + guardadas)
export function loadCategories() {
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

  // Obtener categorías locales desde CustomSticker.js
  const localCats = getLocalStickerCategories();
  
  // Convertir las categorías locales al formato interno, marcándolas como de solo lectura
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
    order: cat.order || 999
  }));

  // Combinar: primero las locales (por orden), luego las del usuario
  categories = [...readonlyLocalCats, ...userCategories];
  
  return categories;
}

function saveUserCategories(userCats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userCats));
  window.dispatchEvent(new CustomEvent('stickers-updated'));
}

function saveCategories() {
  // Separar categorías del usuario (no locales) y guardarlas
  const userCats = categories.filter(c => !c.isLocalCategory);
  saveUserCategories(userCats);
}

export function getCategories() {
  if (categories.length === 0) loadCategories();
  return categories;
}

// Solo las categorías donde el usuario puede añadir stickers (excluyendo locales)
export function getAvailableCategoriesForNew() {
  return getCategories().filter(c => !c.isLocalCategory).map(c => c.name);
}

// El usuario solo puede crear categorías si no supera el límite y si no es local
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
  if (!category || category.isLocalCategory) return false;
  return category.stickers.length < MAX_STICKERS_PER_CATEGORY;
}

export function addCustomSticker(stickerData, categoryName) {
  const category = getCategories().find(c => c.name === categoryName);
  if (!category) throw new Error('Categoría no encontrada');
  if (category.isLocalCategory) throw new Error('No puedes añadir stickers a una categoría de solo lectura');
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