// scripts/Theme/themeStorage.js

import { STORAGE_KEYS, DEFAULT_OPACITY } from './themeConstants.js';
import { safeJsonParse, parseOpacity } from './themeUtils.js';

export class ThemeStorage {
  constructor() {
    this.storage = localStorage;
  }

  getThemePrefs() {
    const saved = this.storage.getItem(STORAGE_KEYS.THEME);
    const prefs = safeJsonParse(saved, {});
    return {
      theme: prefs.theme || 'dark',
      bg: prefs.bg || null
    };
  }

  getBgMode() {
    return this.storage.getItem(STORAGE_KEYS.BG_MODE) || 'theme';
  }

  getCustomBg() {
    return this.storage.getItem(STORAGE_KEYS.CUSTOM_BG) || '';
  }

  getBgOpacity() {
    const saved = this.storage.getItem(STORAGE_KEYS.BG_OPACITY);
    return saved !== null ? parseOpacity(saved) : DEFAULT_OPACITY;
  }

  getUserImages() {
    const saved = this.storage.getItem(STORAGE_KEYS.USER_IMAGES);
    return safeJsonParse(saved, []);
  }

  saveThemePrefs(theme, bgMode, customBgUrl, opacity) {
    this.storage.setItem(STORAGE_KEYS.THEME, JSON.stringify({ theme, bg: customBgUrl || null }));
    this.storage.setItem(STORAGE_KEYS.BG_MODE, bgMode);
    
    if (bgMode === 'custom' && customBgUrl) {
      this.storage.setItem(STORAGE_KEYS.CUSTOM_BG, customBgUrl);
    } else {
      this.storage.removeItem(STORAGE_KEYS.CUSTOM_BG);
    }
    
    if (opacity !== undefined && opacity !== null) {
      this.storage.setItem(STORAGE_KEYS.BG_OPACITY, opacity.toString());
    }
  }

  saveUserImage(dataUrl) {
    const images = this.getUserImages();
    if (!images.includes(dataUrl)) {
      images.unshift(dataUrl);
      if (images.length > 20) images.pop();
      this.storage.setItem(STORAGE_KEYS.USER_IMAGES, JSON.stringify(images));
    }
  }

  removeUserImages(urls) {
    const toRemove = new Set(urls);
    const images = this.getUserImages().filter(url => !toRemove.has(url));
    this.storage.setItem(STORAGE_KEYS.USER_IMAGES, JSON.stringify(images));
    return images;
  }
}