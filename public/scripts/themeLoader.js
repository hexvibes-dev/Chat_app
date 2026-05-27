(function() {
  const root = document.documentElement;
  const STORAGE_THEME = 'chat_theme_prefs';
  const STORAGE_BG_MODE = 'chat_bg_mode';
  const STORAGE_CUSTOM_BG = 'chat_custom_bg';
  const STORAGE_BG_OPACITY = 'chat_bg_opacity';
  
  const themesData = {
    dark: { bg: '/img/dark.jpg', color: '#17212b' },
    light: { bg: '/img/light.jpg', color: '#f8fafc' },
    basic: { bg: '/img/patron1.jpg', color: '#2a2a3a' },
    terminal: { bg: 'null', color: '#000000' },
    spongebob: { bg: '/img/spongebob.jpg', color: '#FBEB22' },
    cristal: { bg: '/img/bg.jpg', color: '#1e293b' },
    forest: { bg: '/img/bg-forest.jpg', color: '#1e3a1e' },
    ocean: { bg: '/img/bg-ocean.jpg', color: '#082f49' },
    magenta: { bg: '/img/patron1.jpg', color: '#16222F' },
    whatsapp: { bg: '/img/dark.jpg', color: '#e5ddd5' },
    reference: { bg: '/img/dark.jpg', color: '#030F0F' },
    midnight: { bg: '/img/magic.jpg', color: '#0b0f19' },
    nuevo: { bg: '/img/planton.jpg', color: '#169369' }
  };

  window.__THEMES_DATA__ = themesData;

  let theme = 'dark';
  let bgMode = 'theme';
  let customBgUrl = '';
  let bgOpacity = 1;

  try {
    const savedPrefs = localStorage.getItem(STORAGE_THEME);
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      if (prefs.theme && themesData[prefs.theme]) theme = prefs.theme;
    }
    bgMode = localStorage.getItem(STORAGE_BG_MODE) || 'theme';
    customBgUrl = localStorage.getItem(STORAGE_CUSTOM_BG) || '';
    const savedOpacity = localStorage.getItem(STORAGE_BG_OPACITY);
    if (savedOpacity !== null) bgOpacity = parseFloat(savedOpacity);
  } catch (e) {}

  root.setAttribute('data-theme', theme);

  let finalBgUrl = null;
  let finalBgColor = themesData[theme]?.color || '#1e293b';

  if (bgMode === 'custom' && customBgUrl) {
    finalBgUrl = customBgUrl;
  } else if (themesData[theme]?.bg && themesData[theme].bg !== 'null') {
    finalBgUrl = themesData[theme].bg;
  }

  if (finalBgUrl) {
    root.style.setProperty('--app-bg-image', `url('${finalBgUrl}')`);
  } else {
    root.style.setProperty('--app-bg-image', 'none');
  }
  root.style.setProperty('--app-bg-color', finalBgColor);
  root.style.setProperty('--app-bg-opacity', bgOpacity.toString());
})();