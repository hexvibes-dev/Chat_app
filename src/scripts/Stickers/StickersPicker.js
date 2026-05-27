import { appendMessage } from '../Messages/messages.js';
import { getCategories, getAllStickers } from './StickerManager.js';

export function getStickerHtml(sticker) {
  const isAnimated = sticker.animated || sticker.url?.match(/\.(gif|webp)(\?|$)/i);
  let animationAttrs = '';
  if (isAnimated && sticker.animationType) {
    animationAttrs = ` data-animated="${sticker.animationType === 'webp' ? 'gif' : sticker.animationType}" data-duration="${sticker.duration || 2000}" data-iterations="${sticker.iterations || 1}"`;
  }
  return `<img src="${sticker.url}" alt="${sticker.name || 'sticker'}" class="sticker-message" style="max-width:200px;max-height:200px;border-radius:12px;display:block;"${animationAttrs}>`;
}

function buildStickerPackAccordion(category, onSelectSticker) {
  const section = document.createElement('div');
  section.className = 'custom-category-item';
  section.style.marginBottom = '12px';

  const readOnlyBadge = category.isLocalCategory ? '<span style="font-size:10px;background:#14b8a6;padding:2px 6px;border-radius:20px;margin-left:8px;">📖</span>' : '';

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      <strong>${escapeHtml(category.name)}</strong>
      <span style="font-size: 12px; opacity: 0.7;">${category.stickers.length}</span>
      ${readOnlyBadge}
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

  category.stickers.forEach(sticker => {
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
    img.alt = sticker.name || 'sticker';
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    `;

    if (sticker.animated) {
      img.classList.add('sticker-animated');
      if (sticker.animationType) {
        img.setAttribute('data-animated', sticker.animationType === 'webp' ? 'gif' : sticker.animationType);
        img.setAttribute('data-duration', sticker.duration || 2000);
        img.setAttribute('data-iterations', sticker.iterations || 1);
      }
    }

    btn.appendChild(img);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stickerHtml = getStickerHtml(sticker);
      onSelectSticker(stickerHtml);
      document.dispatchEvent(new CustomEvent('sticker-sent'));
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
let currentOnSelect = null;

export function initStickersPicker(container, onSelect) {
  if (!container) return;
  currentContainer = container;
  currentOnSelect = onSelect;
  refreshStickersDisplay();
}

export function refreshStickersDisplay() {
  if (!currentContainer) return;
  const allCategories = getCategories();
  // Filtrar las categorías que NO están desactivadas
  const categories = allCategories.filter(cat => !cat.disabled);
  currentContainer.innerHTML = '';

  const scrollDiv = document.createElement('div');
  scrollDiv.style.cssText = 'height: 100%; overflow-y: auto; padding: 12px;';
  currentContainer.appendChild(scrollDiv);

  categories.forEach(cat => {
    const accordion = buildStickerPackAccordion(cat, (stickerHtml) => {
      if (currentOnSelect) currentOnSelect(stickerHtml);
    });
    scrollDiv.appendChild(accordion);
  });

  if (categories.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; color: var(--modal-text); padding: 20px;';
    emptyMsg.textContent = 'No hay stickers guardados. Usa "Crear sticker" para añadir.';
    scrollDiv.appendChild(emptyMsg);
  }
}

export function destroyStickersPicker() {
  if (currentContainer) currentContainer.innerHTML = '';
  currentContainer = null;
  currentOnSelect = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window._refreshStickers = () => {
  refreshStickersDisplay();
};