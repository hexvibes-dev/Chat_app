import { loadCustomEmojis, getCustomEmojiByShortcodeFromData } from '../Emojis/EmojiData.js';
import { convertShortcodesToImages } from '../Emojis/emojiUtils.js';
import { showNotification } from '../Utils/notifications.js';
import { isStaticCategoryDisabled } from '../Emojis/CustomEmojiManager.js';

let modal = null;
let blurOverlay = null;
let keyboardListener = null;
let reactionCategorySearchInput = null;
let reactionEmojiSearchInput = null;
let reactionCategorySearchQuery = '';
let reactionEmojiSearchQuery = '';
let reactionCategoryWrappers = new Map();
let reactionCurrentSearchResults = [];
let reactionCurrentSearchIndex = -1;
let reactionExpandedCategories = new Set();

function showTransientNotification(text, duration = 1000) {
  showNotification(text, duration);
}

function highlightText(text, query) {
  if (!query || query.length === 0) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark style="background:#14b8a6;color:white;border-radius:4px;padding:2px 4px;">$1</mark>');
}

function removeHighlightsFromCategory(categoryWrapper) {
  if (!categoryWrapper) return;
  const header = categoryWrapper.querySelector('.category-header strong');
  if (header && header.innerHTML !== header.textContent) {
    const originalText = header.textContent;
    header.innerHTML = originalText;
  }
}

function expandCategory(categoryWrapper) {
  if (!categoryWrapper) return;
  const content = categoryWrapper.querySelector('.category-content');
  const arrow = categoryWrapper.querySelector('.category-arrow');
  if (content && content.style.maxHeight !== '0px') return;
  if (content && arrow) {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.paddingTop = '12px';
    arrow.textContent = '▲';
    reactionExpandedCategories.add(categoryWrapper.getAttribute('data-category-name'));
  }
}

function collapseCategory(categoryWrapper) {
  if (!categoryWrapper) return;
  const content = categoryWrapper.querySelector('.category-content');
  const arrow = categoryWrapper.querySelector('.category-arrow');
  if (content && arrow) {
    content.style.maxHeight = '0px';
    content.style.paddingTop = '0';
    arrow.textContent = '▼';
    reactionExpandedCategories.delete(categoryWrapper.getAttribute('data-category-name'));
  }
}

function filterReactionCategories(query) {
  reactionCategorySearchQuery = query;
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery || lowerQuery.length < 2) {
    for (const [categoryName, wrapper] of reactionCategoryWrappers.entries()) {
      if (wrapper) {
        wrapper.style.display = '';
        removeHighlightsFromCategory(wrapper);
      }
    }
    if (reactionCategorySearchInput) {
      const helpText = reactionCategorySearchInput.parentElement?.querySelector('.reaction-category-help-text');
      if (helpText) helpText.textContent = '';
    }
    return;
  }
  
  let visibleCount = 0;
  
  for (const [categoryName, wrapper] of reactionCategoryWrappers.entries()) {
    removeHighlightsFromCategory(wrapper);
    
    if (categoryName.toLowerCase().includes(lowerQuery)) {
      wrapper.style.display = '';
      visibleCount++;
      
      const header = wrapper.querySelector('.category-header strong');
      if (header) {
        const currentText = header.textContent;
        const highlighted = highlightText(currentText, lowerQuery);
        header.innerHTML = highlighted;
      }
    } else {
      wrapper.style.display = 'none';
    }
  }
  
  if (reactionCategorySearchInput) {
    const helpText = reactionCategorySearchInput.parentElement?.querySelector('.reaction-category-help-text');
    if (helpText) {
      if (visibleCount === 0) {
        helpText.textContent = `No se encontraron categorías para "${query}"`;
      } else {
        helpText.textContent = `${visibleCount} categoría${visibleCount !== 1 ? 's' : ''} encontrada${visibleCount !== 1 ? 's' : ''}`;
      }
    }
  }
}

function filterReactionEmojis(query) {
  reactionEmojiSearchQuery = query;
  const lowerQuery = query.toLowerCase().trim();
  const accordionsWrapper = document.querySelector('#reaction-accordions');
  
  if (!accordionsWrapper) return;
  
  if (!lowerQuery || lowerQuery.length < 2) {
    const allEmojiItems = accordionsWrapper.querySelectorAll('.emoji-item');
    allEmojiItems.forEach(item => {
      item.style.display = '';
    });
    for (const [categoryName, wrapper] of reactionCategoryWrappers.entries()) {
      if (wrapper) {
        wrapper.style.display = '';
        const content = wrapper.querySelector('.category-content');
        const arrow = wrapper.querySelector('.category-arrow');
        if (reactionExpandedCategories.has(categoryName)) {
          if (content && arrow) {
            content.style.maxHeight = content.scrollHeight + 'px';
            content.style.paddingTop = '12px';
            arrow.textContent = '▲';
          }
        } else {
          if (content && arrow) {
            content.style.maxHeight = '0px';
            content.style.paddingTop = '0';
            arrow.textContent = '▼';
          }
        }
        removeHighlightsFromCategory(wrapper);
      }
    }
    const existingNav = accordionsWrapper.querySelector('.reaction-emoji-search-nav');
    if (existingNav) existingNav.remove();
    reactionCurrentSearchResults = [];
    reactionCurrentSearchIndex = -1;
    if (reactionEmojiSearchInput) {
      const helpText = reactionEmojiSearchInput.parentElement?.querySelector('.reaction-emoji-help-text');
      if (helpText) helpText.textContent = '';
    }
    return;
  }
  
  const categoriesWithResults = new Map();
  const allEmojiItems = accordionsWrapper.querySelectorAll('.emoji-item');
  
  allEmojiItems.forEach((item) => {
    const categoryItem = item.closest('.custom-category-item');
    const categoryName = categoryItem ? categoryItem.getAttribute('data-category-name') : null;
    const emojiText = item.getAttribute('data-emoji') || '';
    const ariaLabel = item.getAttribute('aria-label') || '';
    const shortcodeMatch = emojiText.match(/:([a-zA-Z0-9_]+):/);
    const shortcodeName = shortcodeMatch ? shortcodeMatch[1] : '';
    
    let matches = false;
    if (shortcodeName.toLowerCase().includes(lowerQuery)) {
      matches = true;
    } else if (ariaLabel.toLowerCase().includes(lowerQuery)) {
      matches = true;
    }
    
    if (matches && categoryName) {
      if (!categoriesWithResults.has(categoryName)) {
        categoriesWithResults.set(categoryName, []);
      }
      categoriesWithResults.get(categoryName).push({ element: item, categoryName });
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
  
  const results = [];
  let resultIndex = 0;
  
  for (const [categoryName, categoryResults] of categoriesWithResults.entries()) {
    const wrapper = reactionCategoryWrappers.get(categoryName);
    if (wrapper) {
      wrapper.style.display = '';
      expandCategory(wrapper);
      const header = wrapper.querySelector('.category-header strong');
      if (header && lowerQuery) {
        const currentText = header.textContent;
        if (currentText && !header.querySelector('mark')) {
          const highlighted = highlightText(currentText, lowerQuery);
          header.innerHTML = highlighted;
        }
      }
      for (const result of categoryResults) {
        results.push({ ...result, index: resultIndex++ });
      }
    }
  }
  
  for (const [categoryName, wrapper] of reactionCategoryWrappers.entries()) {
    if (!categoriesWithResults.has(categoryName) && wrapper) {
      wrapper.style.display = 'none';
    }
  }
  
  reactionCurrentSearchResults = results;
  reactionCurrentSearchIndex = results.length > 0 ? 0 : -1;
  
  updateReactionSearchNavigation();
  highlightReactionSearchResult();
  
  if (reactionEmojiSearchInput) {
    const helpText = reactionEmojiSearchInput.parentElement?.querySelector('.reaction-emoji-help-text');
    if (helpText) {
      if (results.length === 0) {
        helpText.textContent = `No se encontraron emojis para "${query}"`;
      } else {
        helpText.textContent = `${results.length} emoji${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''} en ${categoriesWithResults.size} categoría${categoriesWithResults.size !== 1 ? 's' : ''}`;
      }
    }
  }
}

function updateReactionSearchNavigation() {
  const accordionsWrapper = document.querySelector('#reaction-accordions');
  if (!accordionsWrapper) return;
  
  let navContainer = accordionsWrapper.querySelector('.reaction-emoji-search-nav');
  
  if (reactionCurrentSearchResults.length === 0) {
    if (navContainer) navContainer.remove();
    return;
  }
  
  if (!navContainer) {
    navContainer = document.createElement('div');
    navContainer.className = 'reaction-emoji-search-nav';
    navContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;padding:8px;margin-top:8px;border-top:1px solid var(--modal-input-border);';
    accordionsWrapper.appendChild(navContainer);
  }
  
  const prevSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
  const nextSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
  
  navContainer.innerHTML = `
    <button class="reaction-search-nav-prev" style="background:transparent;border:none;cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-color);">${prevSvg}</button>
    <span class="reaction-search-nav-counter" style="font-size:12px;color:var(--text-muted);">${reactionCurrentSearchIndex + 1}/${reactionCurrentSearchResults.length}</span>
    <button class="reaction-search-nav-next" style="background:transparent;border:none;cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-color);">${nextSvg}</button>
  `;
  
  const prevBtn = navContainer.querySelector('.reaction-search-nav-prev');
  const nextBtn = navContainer.querySelector('.reaction-search-nav-next');
  const counterSpan = navContainer.querySelector('.reaction-search-nav-counter');
  
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (reactionCurrentSearchResults.length === 0) return;
    reactionCurrentSearchIndex = (reactionCurrentSearchIndex - 1 + reactionCurrentSearchResults.length) % reactionCurrentSearchResults.length;
    counterSpan.textContent = `${reactionCurrentSearchIndex + 1}/${reactionCurrentSearchResults.length}`;
    highlightReactionSearchResult();
  });
  
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (reactionCurrentSearchResults.length === 0) return;
    reactionCurrentSearchIndex = (reactionCurrentSearchIndex + 1) % reactionCurrentSearchResults.length;
    counterSpan.textContent = `${reactionCurrentSearchIndex + 1}/${reactionCurrentSearchResults.length}`;
    highlightReactionSearchResult();
  });
}

function highlightReactionSearchResult() {
  const allItems = document.querySelectorAll('#reaction-accordions .emoji-item');
  allItems.forEach(item => {
    item.style.outline = '';
    item.style.transform = '';
    item.style.transition = '';
  });
  
  if (reactionCurrentSearchIndex >= 0 && reactionCurrentSearchResults[reactionCurrentSearchIndex]) {
    const currentResult = reactionCurrentSearchResults[reactionCurrentSearchIndex];
    const element = currentResult.element;
    element.style.outline = '2px solid #14b8a6';
    element.style.outlineOffset = '2px';
    element.style.transform = 'scale(1.05)';
    element.style.transition = 'transform 0.2s';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (element) element.style.transform = '';
    }, 500);
  }
}

function buildReactionCategorySearchBar() {
  const wrapper = document.createElement('div');
  wrapper.className = 'reaction-category-search-wrapper';
  wrapper.style.cssText = 'padding:8px 12px;margin-bottom:8px;border-bottom:1px solid var(--modal-input-border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  
  const searchIcon = document.createElement('span');
  searchIcon.textContent = '🔍';
  searchIcon.style.cssText = 'font-size:14px;opacity:0.7;';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Buscar categorías...';
  input.className = 'reaction-category-search-input';
  input.style.cssText = 'flex:1;padding:8px 12px;border-radius:40px;border:1px solid var(--modal-input-border);background:var(--input-bg);color:var(--text-color);outline:none;font-size:14px;';
  input.setAttribute('autocomplete', 'off');
  
  const helpText = document.createElement('span');
  helpText.className = 'reaction-category-help-text';
  helpText.style.cssText = 'font-size:11px;color:var(--text-muted);';
  
  let debounce;
  input.addEventListener('input', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(debounce);
    const query = e.target.value.trim();
    debounce = setTimeout(() => {
      filterReactionCategories(query);
    }, 300);
  });
  
  wrapper.appendChild(searchIcon);
  wrapper.appendChild(input);
  wrapper.appendChild(helpText);
  
  reactionCategorySearchInput = input;
  
  return wrapper;
}

function buildReactionEmojiSearchBar() {
  const wrapper = document.createElement('div');
  wrapper.className = 'reaction-emoji-search-wrapper';
  wrapper.style.cssText = 'padding:8px 12px;margin-bottom:8px;border-bottom:1px solid var(--modal-input-border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  
  const searchIcon = document.createElement('span');
  searchIcon.textContent = '🔍';
  searchIcon.style.cssText = 'font-size:14px;opacity:0.7;';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Buscar emojis...';
  input.className = 'reaction-emoji-search-input';
  input.style.cssText = 'flex:1;padding:8px 12px;border-radius:40px;border:1px solid var(--modal-input-border);background:var(--input-bg);color:var(--text-color);outline:none;font-size:14px;';
  input.setAttribute('autocomplete', 'off');
  
  const helpText = document.createElement('span');
  helpText.className = 'reaction-emoji-help-text';
  helpText.style.cssText = 'font-size:11px;color:var(--text-muted);';
  
  let debounce;
  input.addEventListener('input', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(debounce);
    const query = e.target.value.trim();
    debounce = setTimeout(() => {
      filterReactionEmojis(query);
    }, 300);
  });
  
  wrapper.appendChild(searchIcon);
  wrapper.appendChild(input);
  wrapper.appendChild(helpText);
  
  reactionEmojiSearchInput = input;
  
  return wrapper;
}

function buildSubcategoryAccordion(categoryName, emojis, onSelect, isDisabled = false, icon = null) {
  if (!emojis || emojis.length === 0) return null;
  if (isDisabled) return null;

  const section = document.createElement('div');
  section.className = 'custom-category-item reaction-category-item';
  section.setAttribute('data-category-name', categoryName);
  section.style.marginBottom = '12px';

  const header = document.createElement('div');
  header.className = 'category-header';
  
  let iconHtml = '';
  if (icon) {
    if (icon.startsWith('<svg')) {
      let svgIcon = icon;
      if (svgIcon.includes('<svg')) {
        svgIcon = svgIcon.replace(/<svg/, '<svg style="width:20px;height:20px;display:block"');
        svgIcon = svgIcon.replace(/fill="none"/g, 'fill="currentColor"');
        if (!svgIcon.includes('fill="')) {
          svgIcon = svgIcon.replace(/<svg/, '<svg fill="currentColor"');
        }
      }
      iconHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:8px;">${svgIcon}</span>`;
    } else {
      iconHtml = `<span style="margin-right:8px;">${icon}</span>`;
    }
  }
  
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      ${iconHtml}
      <strong>${escapeHtml(categoryName)}</strong>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'category-content';
  content.style.maxHeight = '0px';
  content.style.paddingTop = '0';
  content.style.overflow = 'hidden';
  content.style.transition = 'max-height 0.3s ease-out, padding 0.3s ease';

  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(48px, 1fr))';
  grid.style.gap = '6px';
  grid.style.padding = '8px 12px';

  for (const shortcode of emojis) {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.style.aspectRatio = '1';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '12px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '4px';
    btn.setAttribute('data-emoji', shortcode);

    // Generar el HTML y asignarlo directamente
    const imgHtml = convertShortcodesToImages(shortcode);
    btn.innerHTML = imgHtml;

    // Ajustar estilos para que se vean correctamente
    const img = btn.querySelector('img');
    if (img) {
      img.style.width = '32px';
      img.style.height = '32px';
      img.style.maxWidth = '32px';
      img.style.maxHeight = '32px';
      img.style.objectFit = 'contain';
    }
    
    const span = btn.querySelector('span');
    if (span) {
      const svg = span.querySelector('svg');
      if (svg) {
        svg.style.width = '32px';
        svg.style.height = '32px';
        svg.style.display = 'block';
        // Forzar color visible (gris claro)
        if (svg.getAttribute('fill') === 'none' || !svg.hasAttribute('fill')) {
          svg.setAttribute('fill', '');
        }
        const paths = svg.querySelectorAll('path, circle, rect, polygon');
        paths.forEach(path => {
          if (path.getAttribute('fill') === 'none' || !path.hasAttribute('fill')) {
            path.setAttribute('fill', '');
          }
          if (path.getAttribute('stroke') === 'none' || !path.hasAttribute('stroke')) {
            path.setAttribute('stroke', '');
          }
        });
      }
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';
      span.style.justifyContent = 'center';
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(shortcode);
      hideModal();
    });
    grid.appendChild(btn);
  }

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

function renderModalContent(onAdd) {
  if (!modal) return;

  loadCustomEmojis();
  const subcategories = window._customEmojiSubcategories || [];
  
  reactionCategoryWrappers.clear();
  reactionExpandedCategories.clear();

  const container = modal.querySelector('.add-reaction-card');
  if (!container) return;

  const existingActions = container.querySelector('.add-reaction-actions');
  
  const oldWrapper = container.querySelector('#reaction-accordions');
  if (oldWrapper) oldWrapper.remove();

  if (subcategories.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'reaction-accordions-wrapper';
    wrapper.id = 'reaction-accordions';
    wrapper.style.marginTop = '16px';
    wrapper.style.maxHeight = '400px';
    wrapper.style.overflowY = 'auto';
    
    const categorySearchBar = buildReactionCategorySearchBar();
    const emojiSearchBar = buildReactionEmojiSearchBar();
    wrapper.appendChild(categorySearchBar);
    wrapper.appendChild(emojiSearchBar);
    
    for (const subcat of subcategories) {
      const isDisabled = subcat.isStatic && isStaticCategoryDisabled(subcat.name);
      if (isDisabled) continue;
      const icon = subcat.categoryData?.icon || null;
      const accordion = buildSubcategoryAccordion(subcat.name, subcat.emojis, onAdd, isDisabled, icon);
      if (accordion) {
        wrapper.appendChild(accordion);
        reactionCategoryWrappers.set(subcat.name, accordion);
      }
    }
    container.insertBefore(wrapper, existingActions);
  }
}

export function showAddReactionModal(onAdd) {
  window.dispatchEvent(new CustomEvent('close-all-popups'));

  if (modal) return;

  blurOverlay = document.createElement('div');
  blurOverlay.className = 'modal-blur-overlay';
  document.body.appendChild(blurOverlay);
  blurOverlay.getBoundingClientRect();
  blurOverlay.classList.add('visible');

  modal = document.createElement('div');
  modal.className = 'add-reaction-modal enter';
  modal.innerHTML = `
    <div class="add-reaction-card" style="width: 480px; max-width: 90vw;">
      <h1>Añade tu reacción</h1>
      <input id="addReactionInput" maxlength="5" placeholder="Emoji, texto o emoticono" />
      <div class="add-reaction-actions">
        <button id="addReactionCancel" class="btn">Cancelar</button>
        <button id="addReactionAccept" class="btn primary">Aceptar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.classList.remove('enter');

  const input = modal.querySelector('#addReactionInput');
  const btnCancel = modal.querySelector('#addReactionCancel');
  const btnAccept = modal.querySelector('#addReactionAccept');

  if (!input || !btnCancel || !btnAccept) {
    hideModal();
    return;
  }

  renderModalContent(onAdd);

  btnCancel.addEventListener('click', () => hideModal());
  btnAccept.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    onAdd(val);
    hideModal();
    showTransientNotification('Reacción añadida');
  });

  input.focus();

  function updateModalPosition() {
    if (!modal) return;
    const vv = window.visualViewport;
    if (!vv) {
      modal.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
    const offset = keyboardHeight * 0.6;
    modal.style.transform = `translate(-50%, calc(-50% - ${offset}px))`;
  }

  if (window.visualViewport) {
    keyboardListener = () => updateModalPosition();
    window.visualViewport.addEventListener('resize', keyboardListener);
    window.visualViewport.addEventListener('scroll', keyboardListener);
    window.addEventListener('keyboardchange', keyboardListener);
  }

  setTimeout(() => {
    window.addEventListener('pointerdown', onOutside);
  }, 0);
}

function onOutside(e) {
  if (!modal) return;
  const target = e.target;
  if (!target) return;
  if (target.closest('.add-reaction-card')) return;
  hideModal();
}

function hideModal() {
  if (!modal) return;

  if (keyboardListener) {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', keyboardListener);
      window.visualViewport.removeEventListener('scroll', keyboardListener);
    }
    window.removeEventListener('keyboardchange', keyboardListener);
    keyboardListener = null;
  }

  if (blurOverlay) {
    blurOverlay.classList.remove('visible');
    setTimeout(() => {
      if (blurOverlay && blurOverlay.parentNode) blurOverlay.parentNode.removeChild(blurOverlay);
      blurOverlay = null;
    }, 200);
  }

  modal.classList.add('leave');
  setTimeout(() => {
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
  }, 80);
  window.removeEventListener('pointerdown', onOutside);
  reactionCategorySearchInput = null;
  reactionEmojiSearchInput = null;
  reactionCategorySearchQuery = '';
  reactionEmojiSearchQuery = '';
  reactionCategoryWrappers.clear();
  reactionCurrentSearchResults = [];
  reactionCurrentSearchIndex = -1;
  reactionExpandedCategories.clear();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}