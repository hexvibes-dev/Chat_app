import { getStaticEmojiCategories } from './StaticEmojiCategories.js';
import debug from '../Utils/DebugLogger.js';

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
  debug.log(`[loadDisabledStatic] Categorías desactivadas: ${JSON.stringify(disabledStaticCategories)}`);
}

function saveDisabledStatic() {
  localStorage.setItem(DISABLED_STATIC_KEY, JSON.stringify(disabledStaticCategories));
  debug.log(`[saveDisabledStatic] Guardado: ${JSON.stringify(disabledStaticCategories)}`);
  window.dispatchEvent(new CustomEvent('custom-emojis-updated'));
}

export function isStaticCategoryDisabled(categoryName) {
  loadDisabledStatic();
  const result = disabledStaticCategories.includes(categoryName);
  debug.log(`[isStaticCategoryDisabled] "${categoryName}" -> ${result}`);
  return result;
}

export function toggleStaticCategoryDisabled(categoryName) {
  debug.log(`[toggleStaticCategoryDisabled] Categoría: ${categoryName}`);
  loadDisabledStatic();
  debug.log(`Estado actual: ${JSON.stringify(disabledStaticCategories)}`);
  
  if (disabledStaticCategories.includes(categoryName)) {
    debug.log(`Activando categoría "${categoryName}"`);
    disabledStaticCategories = disabledStaticCategories.filter(c => c !== categoryName);
  } else {
    debug.log(`Desactivando categoría "${categoryName}"`);
    disabledStaticCategories.push(categoryName);
  }
  
  debug.log(`Nuevo estado: ${JSON.stringify(disabledStaticCategories)}`);
  saveDisabledStatic();
  
  debug.log(`Recargando categorías locales...`);
  categories = [];
  loadCategories();
  
  debug.log(`Actualizando picker...`);
  if (window._refreshCustomEmojis) {
    window._refreshCustomEmojis();
  } else {
    debug.logWarn('window._refreshCustomEmojis no está disponible');
  }
  
  return !disabledStaticCategories.includes(categoryName);
}

export function loadCategories() {
  loadDisabledStatic();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    categories = JSON.parse(saved);
    debug.log(`[loadCategories] Cargadas ${categories.length} categorías de usuario`);
  } else {
    categories = [
      { name: 'Favoritos', emojis: [] }
    ];
    saveCategories();
    debug.log(`[loadCategories] Categorías por defecto creadas`);
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
    debug.log(`[getCategories] Categoría estática "${cat.name}" -> disabled: ${disabled}`);
    return {
      ...cat,
      isStaticCategory: true,
      isReadOnly: true,
      disabled: disabled
    };
  });
  const allCats = [...categories, ...staticCats];
  debug.log(`[getCategories] Total categorías: ${allCats.length} (usuario: ${categories.length}, estáticas: ${staticCats.length})`);
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
  debug.log(`[getCustomEmojiArray] INICIO`);
  const result = [];
  const allCategories = getCategories();
  debug.log(`[getCustomEmojiArray] Categorías: ${allCategories.map(c => c.name + '(disabled:' + c.disabled + ')').join(', ')}`);
  
  for (const category of allCategories) {
    if (category.disabled) {
      debug.log(`[getCustomEmojiArray] Saltando categoría DESHABILITADA: "${category.name}"`);
      continue;
    }
    debug.log(`[getCustomEmojiArray] Procesando categoría ACTIVA: "${category.name}" con ${category.emojis?.length || 0} emojis`);
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
      debug.log(`  Añadido: ${emoji.shortcodes[0]} (${category.name})`);
    }
  }
  debug.log(`[getCustomEmojiArray] RESULTADO: ${result.length} emojis`);
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
  debug.log(`[refreshCustomEmojisInPicker] Llamado`);
  if (window._refreshCustomEmojis) {
    window._refreshCustomEmojis();
  } else {
    debug.logWarn('window._refreshCustomEmojis no disponible');
  }
}

export function debugDisabledCategories() {
  loadDisabledStatic();
  debug.log(`DEBUG - Categorías desactivadas: ${JSON.stringify(disabledStaticCategories)}`);
  return disabledStaticCategories;
}

export function debugAllCategories() {
  const allCats = getCategories();
  debug.log(`DEBUG - Todas las categorías: ${allCats.map(c => c.name + ' (disabled: ' + c.disabled + ', isStatic: ' + c.isStaticCategory + ')').join(', ')}`);
  return allCats;
}

export function debugCustomEmojiArray() {
  const emojis = getCustomEmojiArray();
  debug.log(`DEBUG - Emojis en getCustomEmojiArray: ${emojis.map(e => e.shortcodes[0] + ' (cat: ' + e.category + ')').join(', ')}`);
  return emojis;
}