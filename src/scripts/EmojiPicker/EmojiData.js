import emojis from 'unicode-emoji-json';
import { getCustomEmojiArray, getCategories as getUserCategories } from '../CustomEmojiManager.js';
import { customEmojiCollection } from '../CustomEmojiPicker.js';

const GROUP_TO_CATEGORY = {
  'Smileys & Emotion': 'smileys',
  'People & Body': 'people',
  'Animals & Nature': 'animals',
  'Food & Drink': 'food',
  'Travel & Places': 'travel',
  'Activities': 'activities',
  'Objects': 'objects',
  'Symbols': 'symbols',
  'Flags': 'flags'
};

export const EMOJI_CATEGORIES = {
  recent: { name: 'Recientes', icon: '🕒', emojis: [] },
  custom: { name: 'Personalizados', icon: '⭐', emojis: [], subcategories: [] },
  smileys: { name: 'Smileys', icon: '😀', emojis: [] },
  people: { name: 'People', icon: '👋', emojis: [] },
  animals: { name: 'Animals', icon: '🐶', emojis: [] },
  food: { name: 'Food', icon: '🍕', emojis: [] },
  travel: { name: 'Travel', icon: '✈️', emojis: [] },
  activities: { name: 'Activities', icon: '⚽', emojis: [] },
  objects: { name: 'Objects', icon: '💡', emojis: [] },
  symbols: { name: 'Symbols', icon: '🔣', emojis: [] },
  flags: { name: 'Flags', icon: '🏁', emojis: [] }
};

let unicodeEmojisLoaded = false;
if (!unicodeEmojisLoaded) {
  for (const [emoji, data] of Object.entries(emojis)) {
    const groupName = data.group;
    const categoryKey = GROUP_TO_CATEGORY[groupName];
    if (categoryKey && EMOJI_CATEGORIES[categoryKey]) {
      if (EMOJI_CATEGORIES[categoryKey].emojis.length < 800) {
        EMOJI_CATEGORIES[categoryKey].emojis.push(emoji);
      }
    }
  }
  unicodeEmojisLoaded = true;
}

let cachedStaticShortcodes = null;
let cachedMergedData = null;

function getStaticCustomEmojis() {
  if (!cachedStaticShortcodes) {
    cachedStaticShortcodes = customEmojiCollection.map(e => `:${e.shortcodes[0]}:`);
  }
  return cachedStaticShortcodes;
}

function getDynamicCustomEmojis() {
  return getCustomEmojiArray().map(e => `:${e.shortcodes[0]}:`);
}

function getMergedCustomEmojis() {
  const staticShortcodes = getStaticCustomEmojis();
  const dynamicShortcodes = getDynamicCustomEmojis();
  const merged = [...staticShortcodes];
  for (const shortcode of dynamicShortcodes) {
    if (!merged.includes(shortcode)) {
      merged.push(shortcode);
    }
  }
  return merged;
}

export function loadCustomEmojis(force = false) {
  if (force || !cachedMergedData) {
    const customEmojis = getMergedCustomEmojis();
    EMOJI_CATEGORIES.custom.emojis = customEmojis;
    
    const staticData = customEmojiCollection.map(e => ({
      name: e.name,
      shortcodes: e.shortcodes,
      url: e.url,
      category: e.category
    }));
    const dynamicData = getCustomEmojiArray();
    cachedMergedData = [...staticData, ...dynamicData];
    window._customEmojiData = cachedMergedData;
    
    // Cargar subcategorías del usuario
    const userCategories = getUserCategories();
    const subcategories = [];
    
    // 1. Primero, añadir la subcategoría de emojis estáticos (Logos)
    const staticEmojis = getStaticCustomEmojis();
    if (staticEmojis.length > 0) {
      subcategories.push({
        name: 'Logos estáticos',
        emojis: staticEmojis
      });
    }
    
    // 2. Luego, añadir las subcategorías del usuario (Favoritos, Logos, Animados, etc.)
    for (const cat of userCategories) {
      subcategories.push({
        name: cat.name,
        emojis: cat.emojis.map(e => `:${e.shortcodes[0]}:`)
      });
    }
    
    EMOJI_CATEGORIES.custom.subcategories = subcategories;
    // Exponer subcategorías globalmente para addReaction.js
    window._customEmojiSubcategories = subcategories;
  }
  return window._customEmojiData;
}

export function refreshCustomEmojis() {
  cachedMergedData = null;
  cachedStaticShortcodes = null;
  return loadCustomEmojis(true);
}

export function getCustomEmojiData() {
  return window._customEmojiData || [];
}

export function getCustomEmojiByShortcodeFromData(shortcode) {
  const data = getCustomEmojiData();
  return data.find(e => e.shortcodes.includes(shortcode));
}

export const RECENT_STORAGE_KEY = 'emoji_recent';
const MAX_RECENT = 20;

export function getRecentEmojis() {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentEmoji(emoji) {
  const recents = getRecentEmojis();
  const index = recents.indexOf(emoji);
  if (index !== -1) recents.splice(index, 1);
  recents.unshift(emoji);
  const trimmed = recents.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(trimmed));
  
  EMOJI_CATEGORIES.recent.emojis = trimmed;
  if (window._updateRecentCategory) {
    window._updateRecentCategory(trimmed);
  }
  
  return trimmed;
}

export function updateRecentCategory() {
  const recents = getRecentEmojis();
  EMOJI_CATEGORIES.recent.emojis = recents;
  return recents;
}

export function searchEmojis(query) {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  for (const category of Object.values(EMOJI_CATEGORIES)) {
    for (const emoji of category.emojis) {
      if (results.length >= 50) break;
      const emojiName = emojis[emoji]?.name?.toLowerCase() || '';
      if (emojiName.includes(lowerQuery)) {
        results.push(emoji);
      }
    }
    if (results.length >= 50) break;
  }
  
  const customEmojis = getCustomEmojiData();
  for (const custom of customEmojis) {
    if (results.length >= 50) break;
    if (custom.name.toLowerCase().includes(lowerQuery) || custom.shortcodes[0].toLowerCase().includes(lowerQuery)) {
      results.push(`:${custom.shortcodes[0]}:`);
    }
  }
  
  return results;
}

export function getCategoryEmojis(categoryKey) {
  if (categoryKey === 'recent') {
    updateRecentCategory();
    return EMOJI_CATEGORIES.recent.emojis;
  }
  if (categoryKey === 'custom') {
    return { type: 'subcategories', data: EMOJI_CATEGORIES.custom.subcategories };
  }
  return EMOJI_CATEGORIES[categoryKey]?.emojis || [];
}