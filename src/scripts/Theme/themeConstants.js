// scripts/Theme/themeConstants.js

export const STORAGE_KEYS = {
  THEME: 'chat_theme_prefs',
  BG_MODE: 'chat_bg_mode',
  CUSTOM_BG: 'chat_custom_bg',
  BG_OPACITY: 'chat_bg_opacity',
  USER_IMAGES: 'chat_user_images'
};

export const ALLOWED_THEMES = [
  'dark', 'light', 'basic', 'terminal', 'spongebob', 
  'cristal', 'forest', 'ocean', 'whatsapp', 'midnight', 
  'reference', 'magenta', 'nuevo'
];

export const NATIVE_BACKGROUNDS = {
  movil: [
    { name: 'Bosque encantado version movil', url: '/img/bg.jpg' },
    { name: 'Nubes', url: '/img/nubes.jpg' },
    { name: 'Planton', url: '/img/planton.jpg' }
  ],
  tableta: [
    { name: 'Ballena', url: '/img/ballena.jpg' }
  ],
  pc: [
    { name: 'Bosque encantado version pc', url: '/img/magic.jpg' }
  ],
  'colores solidos': [
    { name: 'Blanco', url: '/img/light.jpg', color: '#ffffff' },
    { name: 'Negro', url: '/img/dark.jpg', color: '#000000' }
  ]
};

export const THEMES_UI = {
  dark: { name: 'Oscuro' },
  light: { name: 'Claro' },
  basic: { name: 'Basico' },
  terminal: { name: 'Terminal' },
  spongebob: { name: 'Bob Esponja' },
  cristal: { name: 'Cristal' },
  forest: { name: 'Bosque' },
  ocean: { name: 'Océano' },
  magenta: { name: 'Magenta' },
  whatsapp: { name: 'WhatsApp' },
  midnight: { name: 'Midnight' },
  reference: { name: 'Referencia' },
  nuevo: { name: 'Nuevo' }
};

export const DEFAULT_OPACITY = 1;
export const DEFAULT_BG_COLOR = '#1e293b';
export const MAX_USER_IMAGES = 20;