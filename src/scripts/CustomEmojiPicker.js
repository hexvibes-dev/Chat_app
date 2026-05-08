// src/scripts/CustomEmojiPicker.js

import 'emoji-picker-element';

export const customEmojiCollection = [
  {
    name: 'Logo',
    shortcodes: ['ico'],
    url: '/img/emojis/ico.png',
    category: 'Personalizados',
    keywords: ['logo', 'icono', 'imagen'],
    animated: false
  },
  {
    name: 'logo2',
    shortcodes: ['ico2'],
    url: '/img/emojis/ico2.png',
    category: 'Personalizados',
    keywords: ['logo2', 'icono2', 'imagen2'],
    animated: false
  },
  {
    name: 'logo4',
    shortcodes: ['ico4'],
    url: '/img/emojis/ico4.png',
    category: 'Personalizados',
    keywords: ['logo', '👍', 'imagen4'],
    animated: false
  },
  {
    name: 'logo5',
    shortcodes: ['ico5'],
    url: '/img/emojis/ico5.png',
    category: 'Personalizados',
    keywords: ['logo5', 'icono5', 'imagen5'],
    animated: false
  },
  {
    name: 'logo6',
    shortcodes: ['ico6'],
    url: '/img/emojis/ico6.png',
    category: 'Personalizados',
    keywords: ['logo6', 'icono6', 'imagen6'],
    animated: false
  },
  {
    name: 'logo7',
    shortcodes: ['ico7'],
    url: '/img/emojis/ico7.png',
    category: 'Personalizados',
    keywords: ['logo7', 'icono7', 'imagen7'],
    animated: false
  },
  {
    name: 'logo8',
    shortcodes: ['ico8'],
    url: '/img/emojis/ico.webp',
    category: 'Personalizados',
    keywords: ['8', 'gif', 'ñe', 'animated', 'webp'],
    animated: true,
    animationType: 'webp',
    duration: 2000,
    iterations: 3
  },
  {
    name: 'gif_animado',
    shortcodes: ['gifanim'],
    url: '/img/emojis/animado.gif',
    category: 'Personalizados',
    keywords: ['gif', 'animado', 'movimiento'],
    animated: true,
    animationType: 'gif',
    duration: 1500,
    iterations: 'infinite'
  }
];

if (typeof window !== 'undefined') {
  window.customEmojiCollection = customEmojiCollection;
}

export function createCustomEmojiPicker() {
  const picker = document.createElement('emoji-picker');
  picker.customEmoji = customEmojiCollection;
  picker.addEventListener('ready', () => {
    const customSection = picker.shadowRoot?.querySelector('[data-category="Personalizados"]');
    if (customSection) customSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  return picker;
}

export function getCustomEmojiByShortcode(shortcode) {
  return customEmojiCollection.find(e => e.shortcodes.includes(shortcode));
}

export function getCustomEmojiByUrl(url) {
  return customEmojiCollection.find(e => e.url === url);
}

export function isAnimatedEmoji(emojiData) {
  return emojiData && emojiData.animated === true;
}

export function getAnimationType(emojiData) {
  return emojiData && emojiData.animationType ? emojiData.animationType : null;
}