// src/scripts/CustomSticker.js

// Categorías locales de solo lectura (aparecerán en el picker de stickers)
export const localStickerCategories = [
  {
    name: 'Stickers Locales',
    icon: '📦',           // opcional, se puede usar en el futuro
    order: 1,             // opcional, orden de aparición (menor primero)
    stickers: [
      {
        id: 'local_sticker_1',
        name: 'Sticker divertido',
        url: '/stickers/ico1.webp',
        keywords: ['divertido', 'gracioso', 'mememe'],
        animated: false
      },
      {
        id: 'local_sticker_2',
        name: 'Gato bailando',
        url: '/img/stickers/cat-dance.gif',
        keywords: ['gato', 'bailar', 'danza'],
        animated: true,
        animationType: 'gif',
        duration: 2000,
        iterations: 'infinite'
      },
      {
        id: 'local_sticker_3',
        name: 'Perro feliz',
        url: '/img/stickers/happy-dog.webp',
        keywords: ['perro', 'feliz', 'alegre'],
        animated: true,
        animationType: 'webp',
        duration: 2500,
        iterations: 3
      }
    ]
  },
  {
    name: 'Emojis Animados',
    icon: '🎬',
    order: 2,
    stickers: [
      {
        id: 'local_heart',
        name: 'Corazón latiendo',
        url: '/img/stickers/heart-beat.gif',
        keywords: ['amor', 'corazon', 'late'],
        animated: true,
        animationType: 'gif',
        duration: 1500,
        iterations: 'infinite'
      },
      {
        id: 'local_star',
        name: 'Estrella brillante',
        url: '/img/stickers/shining-star.webp',
        keywords: ['estrella', 'brillo', 'magia'],
        animated: true,
        animationType: 'webp',
        duration: 1800,
        iterations: 5
      }
    ]
  },
  {
    name: 'Reacciones',
    icon: '😊',
    order: 3,
    stickers: [
      {
        id: 'local_thumbsup',
        name: 'Pulgar arriba',
        url: '/img/stickers/thumbs-up.png',
        keywords: ['like', 'bien', 'ok', 'pulgar'],
        animated: false
      },
      {
        id: 'local_lol',
        name: 'Llorando de risa',
        url: '/img/stickers/lol.webp',
        keywords: ['risa', 'lol', 'gracia', 'chiste'],
        animated: true,
        animationType: 'webp',
        duration: 2000,
        iterations: 'infinite'
      }
    ]
  }
];

// Función para obtener todas las categorías locales
export function getLocalStickerCategories() {
  return localStickerCategories.sort((a, b) => (a.order || 999) - (b.order || 999));
}

// Función para obtener todos los stickers locales (aplanados)
export function getAllLocalStickers() {
  const all = [];
  for (const cat of localStickerCategories) {
    for (const sticker of cat.stickers) {
      all.push({
        ...sticker,
        category: cat.name,
        isLocal: true
      });
    }
  }
  return all;
}

// Buscar un sticker por su id
export function getLocalStickerById(id) {
  for (const cat of localStickerCategories) {
    const found = cat.stickers.find(s => s.id === id);
    if (found) return { ...found, category: cat.name, isLocal: true };
  }
  return null;
}

// Buscar stickers por palabra clave (para sugerencias)
export function searchLocalStickers(query) {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  const results = [];
  for (const sticker of getAllLocalStickers()) {
    const nameMatch = sticker.name?.toLowerCase().includes(lower);
    const keywordMatch = sticker.keywords?.some(k => k.toLowerCase().includes(lower));
    if (nameMatch || keywordMatch) {
      results.push(sticker);
    }
  }
  return results.slice(0, 10);
}