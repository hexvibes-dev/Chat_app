import 'emoji-picker-element';

export const customEmojiCollection = [
  {
    name: 'Logo',
    shortcodes: ['ico'],
    url: '/img/emojis/ico.png',
    category: 'Personalizados'
  },
  {
    name: 'logo2',
    shortcodes: ['ico2'],
    url: '/img/emojis/ico2.png',
    category: 'Personalizados'
  },
  {
    name: 'logo4',
    shortcodes: ['ico4'],
    url: '/img/emojis/ico4.png',
    category: 'Personalizados'
  },
  {
    name: 'logo5',
    shortcodes: ['ico5'],
    url: '/img/emojis/ico5.png',
    category: 'Personalizados'
  },
  {
    name: 'logo6',
    shortcodes: ['ico6'],
    url: '/img/emojis/ico6.png',
    category: 'Personalizados'
  },
  {
    name: 'logo7',
    shortcodes: ['ico7'],
    url: '/img/emojis/ico7.png',
    category: 'Personalizados'
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