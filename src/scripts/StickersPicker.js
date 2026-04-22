import { insertAtCursor } from './input.js';

const stickerPacks = [
  {
    id: 'default',
    name: 'Stickers básicos',
    icon: '😀',
    stickers: [
      { url: '/img/stickers/sticker.jpg', name: 'feliz' },
      { url: '/img/stickers/sticker.jpg', name: 'amor' },
      { url: '/img/stickers/sticker.jpg', name: 'fiesta' },
      { url: '/img/stickers/sticker.jpg', name: 'genial' },
      { url: '/img/stickers/sticker.jpg', name: 'triste' }
    ]
  },
  {
    id: 'memes',
    name: 'Memes divertidos',
    icon: '😂',
    stickers: [
      { url: '/img/stickers/sticker.jpg', name: 'risa' },
      { url: '/img/stickers/sticker.jpg', name: 'llanto' },
      { url: '/img/stickers/sticker.jpg', name: 'pensando' },
      { url: '/img/stickers/sticker.jpg', name: 'genial' },
      { url: '/img/stickers/sticker.jpg', name: 'enojo' }
    ]
  },
  {
    id: 'animales',
    name: 'Animales',
    icon: '🐱',
    stickers: [
      { url: '/img/stickers/sticker.jpg', name: 'gato' },
      { url: '/img/stickers/sticker.jpg', name: 'perro' },
      { url: '/img/stickers/sticker.jpg', name: 'zorro' },
      { url: '/img/stickers/sticker.jpg', name: 'panda' },
      { url: '/img/stickers/sticker.jpg', name: 'conejo' }
    ]
  }
];

function getStickerHtml(url, alt) {
  return `<img src="${url}" alt="${alt}" class="sticker-message" style="max-width: 200px; max-height: 200px; border-radius: 12px; display: block;">`;
}

function buildStickerPackAccordion(pack, onSelectSticker) {
  const section = document.createElement('div');
  section.className = 'custom-category-item';
  section.style.marginBottom = '12px';

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      <strong>${escapeHtml(pack.name)}</strong>
      <span style="font-size: 12px; opacity: 0.7;">${pack.stickers.length}</span>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'category-content';
  content.style.maxHeight = '0px';
  content.style.paddingTop = '0';
  content.style.overflow = 'hidden';
  content.style.transition = 'max-height 0.3s ease-out, padding 0.3s ease';

  const grid = document.createElement('div');
  grid.className = 'stickers-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
  grid.style.gap = '8px';
  grid.style.padding = '12px';

  pack.stickers.forEach(sticker => {
    const btn = document.createElement('button');
    btn.className = 'sticker-item';
    btn.style.cssText = `
      aspect-ratio: 1;
      background: var(--input-bg);
      border: none;
      border-radius: 16px;
      cursor: pointer;
      padding: 8px;
      transition: transform 0.1s, background 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const img = document.createElement('img');
    img.src = sticker.url;
    img.alt = sticker.name;
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    `;
    btn.appendChild(img);
    
    btn.addEventListener('click', () => {
      const stickerHtml = getStickerHtml(sticker.url, sticker.name);
      onSelectSticker(stickerHtml);
    });
    
    grid.appendChild(btn);
  });

  content.appendChild(grid);
  section.appendChild(header);
  section.appendChild(content);

  let isExpanded = false;
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    const arrow = header.querySelector('.category-arrow');
    if (isExpanded) {
      content.style.maxHeight = '0px';
      content.style.paddingTop = '0';
      arrow.textContent = '▼';
      isExpanded = false;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.paddingTop = '12px';
      arrow.textContent = '▲';
      isExpanded = true;
    }
  });

  return section;
}

let currentContainer = null;

export function initStickersPicker(container, onSelect) {
  if (!container) return;
  currentContainer = container;
  container.innerHTML = '';

  const scrollDiv = document.createElement('div');
  scrollDiv.style.cssText = 'height: 100%; overflow-y: auto; padding: 12px;';
  container.appendChild(scrollDiv);

  stickerPacks.forEach(pack => {
    const accordion = buildStickerPackAccordion(pack, (stickerHtml) => {
      if (onSelect) onSelect(stickerHtml);
    });
    scrollDiv.appendChild(accordion);
  });

  if (stickerPacks.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; color: var(--modal-text); padding: 20px;';
    emptyMsg.textContent = 'No hay paquetes de stickers disponibles.';
    scrollDiv.appendChild(emptyMsg);
  }
}

export function destroyStickersPicker() {
  if (currentContainer) currentContainer.innerHTML = '';
  currentContainer = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}