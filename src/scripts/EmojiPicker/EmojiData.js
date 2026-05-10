import emojis from 'unicode-emoji-json';
import { getCustomEmojiArray, getCategories as getUserCategories } from '../CustomEmojiManager.js';
import { getStaticEmojiCategories } from '../StaticEmojiCategories.js';
import { isStaticCategoryDisabled } from '../CustomEmojiManager.js';
import debug from '../DebugLogger.js';

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
  recent: { name: 'Recientes', emojis: [] },
  custom: { name: 'Personalizados', emojis: [], subcategories: [] },
  smileys: { name: 'Smileys', emojis: [] },
  people: { name: 'People', emojis: [] },
  animals: { name: 'Animals', emojis: [] },
  food: { name: 'Food', emojis: [] },
  travel: { name: 'Travel', emojis: [] },
  activities: { name: 'Activities', emojis: [] },
  objects: { name: 'Objects', emojis: [] },
  symbols: { name: 'Symbols', emojis: [] },
  flags: { name: 'Flags', emojis: [] }
};

let unicodeEmojisLoaded = false;
if (!unicodeEmojisLoaded) {
  debug.log(`Cargando emojis Unicode...`);
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
  debug.log(`Unicode emojis cargados`);
}

let cachedMergedData = null;
let cachedStaticData = null;

function getStaticEmojisList() {
  if (cachedStaticData) return cachedStaticData;
  const staticCategories = getStaticEmojiCategories();
  const result = [];
  for (const cat of staticCategories) {
    if (isStaticCategoryDisabled(cat.name)) continue;
    for (const emoji of cat.emojis) {
      result.push({
        name: emoji.name,
        shortcodes: emoji.shortcodes,
        url: emoji.url,
        svg: emoji.svg,
        category: cat.name,
        keywords: emoji.keywords || [],
        animated: emoji.animated || false,
        animationType: emoji.animationType || null,
        duration: emoji.duration,
        iterations: emoji.iterations
      });
    }
  }
  cachedStaticData = result;
  return result;
}

function getDynamicCustomEmojis() {
  const result = getCustomEmojiArray();
  debug.log(`[getDynamicCustomEmojis] ${result.length} emojis dinámicos`);
  return result;
}

export function loadCustomEmojis(force = false) {
  debug.log(`[loadCustomEmojis] INICIO (force: ${force})`);
  
  if (force || !cachedMergedData) {
    debug.log(`Generando nuevos datos...`);
    const dynamicData = getDynamicCustomEmojis();
    const staticData = getStaticEmojisList();
    cachedMergedData = [...dynamicData, ...staticData];
    window._customEmojiData = cachedMergedData;
    debug.log(`window._customEmojiData actualizado con ${cachedMergedData.length} emojis (${dynamicData.length} dinámicos + ${staticData.length} estáticos)`);
    
    const allCategories = getUserCategories();
    const staticCategories = getStaticEmojiCategories();
    const subcategories = [];
    
    for (const cat of allCategories) {
      if (cat.isStaticCategory) continue;
      subcategories.push({
        name: cat.name,
        emojis: cat.emojis.map(e => `:${e.shortcodes[0]}:`),
        isStatic: false
      });
      debug.log(`Añadida categoría usuario: ${cat.name} (${cat.emojis.length} emojis)`);
    }
    
    for (const staticCat of staticCategories) {
      if (isStaticCategoryDisabled(staticCat.name)) {
        debug.log(`Saltando categoría estática desactivada: ${staticCat.name}`);
        continue;
      }
      const emojiShortcodes = staticCat.emojis.map(e => `:${e.shortcodes[0]}:`);
      subcategories.push({
        name: staticCat.name,
        emojis: emojiShortcodes,
        isStatic: true,
        categoryName: staticCat.name,
        categoryData: staticCat,
        icon: staticCat.icon
      });
      debug.log(`Añadida categoría estática: ${staticCat.name} (${emojiShortcodes.length} emojis: ${emojiShortcodes.join(', ')})`);
    }
    
    debug.log(`Subcategorías finales: ${subcategories.map(s => s.name + ' [' + s.emojis.length + ']').join(', ')}`);
    
    EMOJI_CATEGORIES.custom.subcategories = subcategories;
    window._customEmojiSubcategories = subcategories;
    debug.log(`EMOJI_CATEGORIES.custom.subcategories actualizado`);
  } else {
    debug.log(`Usando datos cacheados (${cachedMergedData.length} emojis)`);
  }
  return window._customEmojiData;
}

export function refreshCustomEmojis() {
  debug.log(`[refreshCustomEmojis] Llamado`);
  cachedMergedData = null;
  cachedStaticData = null;
  return loadCustomEmojis(true);
}

export function getCustomEmojiData() {
  const data = window._customEmojiData || [];
  debug.log(`[getCustomEmojiData] Retornando ${data.length} emojis`);
  return data;
}

export function getCustomEmojiByShortcodeFromData(shortcode) {
  const data = getCustomEmojiData();
  const found = data.find(e => e.shortcodes && e.shortcodes.includes(shortcode));
  debug.log(`[getCustomEmojiByShortcodeFromData] "${shortcode}" -> ${found ? 'encontrado (' + found.name + ')' : 'NO encontrado'}`);
  return found;
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