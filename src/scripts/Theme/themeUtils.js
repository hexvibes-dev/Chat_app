// scripts/Theme/themeUtils.js

export function getThemeData(themeId) {
  return window.__THEMES_DATA__?.[themeId] || { bg: null, color: '#1e293b' };
}

export function isValidTheme(themeId, allowedThemes) {
  return allowedThemes.includes(themeId);
}

export function parseOpacity(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 1 : Math.min(1, Math.max(0, parsed));
}

export function isDataUrl(str) {
  return str?.startsWith('data:');
}

export function isColorString(str) {
  return str?.startsWith('color:');
}

export function extractColorFromString(str) {
  return isColorString(str) ? str.substring(6) : null;
}

export function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function safeJsonParse(value, defaultValue = null) {
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}