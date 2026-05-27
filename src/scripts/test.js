const root = document.documentElement;
const STORAGE_THEME = 'chat_theme_prefs';
const STORAGE_BG_MODE = 'chat_bg_mode';
const STORAGE_CUSTOM_BG = 'chat_custom_bg';
const STORAGE_BG_OPACITY = 'chat_bg_opacity';
const STORAGE_USER_IMAGES = 'chat_user_images';
const themes = {
  dark: { bg: '/img/dark.jpg', color: '#17212b' },
  light: { bg: '/img/light.jpg', color: '#f8fafc' },
  basic: { name: 'Basico', bg: '/img/patron1.jpg', color: '#2a2a3a' },
  terminal: { name: 'Terminal', bg: 'null', color: '#000000' },
  spongebob: { name: 'Bob Esponja', bg: '/img/spongebob.jpg', color: '#FBEB22' },
  cristal: { bg: '/img/bg.jpg', color: '#1e293b' },
  forest: { bg: '/img/bg-forest.jpg', color: '#1e3a1e' },
  ocean: { bg: '/img/bg-ocean.jpg', color: '#082f49' },
  magenta: { bg: '/img/patron1.jpg', color: '#16222F' },
  whatsapp: { bg: '/img/dark.jpg', color: '#e5ddd5' },
  reference: { bg: '/img/dark.jpg', color: '#030F0F' },
  midnight: { bg: '/img/magic.jpg', color: '#0b0f19' },
  nuevo: { bg: '/img/planton.jpg', color: '#169369' }
};

export function loadTheme() {

  let theme = 'dark';
  let bgMode = 'theme';
  let customBgUrl = '';
  let bgOpacity = 1;

  try {
    const savedPrefs = localStorage.getItem(STORAGE_THEME);
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      if (prefs.theme && themes[prefs.theme]) theme = prefs.theme;
    }
    bgMode = localStorage.getItem(STORAGE_BG_MODE) || 'theme';
    customBgUrl = localStorage.getItem(STORAGE_CUSTOM_BG) || '';
    const savedOpacity = localStorage.getItem(STORAGE_BG_OPACITY);
    if (savedOpacity !== null) bgOpacity = parseFloat(savedOpacity);

    const userImages = JSON.parse(localStorage.getItem(STORAGE_USER_IMAGES) || '[]');
    userImages.forEach(src => {
      if (src && src.startsWith('data:')) {
        const img = new Image();
        img.src = src;
      }
    });
  } catch (e) { }

  root.setAttribute('data-theme', theme);

  let finalBgUrl = null;
  let finalBgColor = themes[theme]?.color || '#1e293b';

  if (bgMode === 'custom' && customBgUrl) {
    finalBgUrl = customBgUrl;
  } else if (themes[theme]?.bg) {
    finalBgUrl = themes[theme].bg;
  }

  if (finalBgUrl) {
    root.style.setProperty('--app-bg-image', `url('${finalBgUrl}')`);
  } else {
    root.style.setProperty('--app-bg-image', 'none');
  }
  root.style.setProperty('--app-bg-color', finalBgColor);
  root.style.setProperty('--app-bg-opacity', bgOpacity);
};


