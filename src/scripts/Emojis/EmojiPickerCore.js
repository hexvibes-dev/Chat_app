import { getCategoryEmojis, addRecentEmoji, getRecentEmojis, searchEmojis, getCustomEmojiData, loadCustomEmojis, refreshCustomEmojis, updateRecentCategory } from './EmojiData.js';
import { polyfillEmojis } from './emojiPolyfill.js';
import { applySkinToneToText, getSkinTone, setSkinTone } from './skinToneManager.js';
import { isStaticCategoryDisabled } from './CustomEmojiManager.js';
import debug from '../Utils/DebugLogger.js';

let activeCategory = 'recent';
let searchQuery = '';
let searchResults = null;
let scrollContainer = null;
let gridContainer = null;
let currentOnEmojiClick = null;

let categorySections = new Map();
let searchSection = null;
let isLoadingCategory = false;
let pendingCategory = null;
let resizeObserver = null;

let customCategorySearchInput = null;
let customCategorySearchQuery = '';
let allCustomCategories = [];
let customCategoryWrappers = new Map();

function preserveInputFocus() {
  const input = document.getElementById('input');
  const wasFocused = input && document.activeElement === input;
  return { wasFocused, input };
}

function restoreInputFocus(wasFocused, input) {
  if (wasFocused && input) {
    input.focus({ preventScroll: true });
  }
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

function filterCustomCategories(query) {
  customCategorySearchQuery = query;
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery || lowerQuery.length < 2) {
    for (const [categoryName, wrapper] of customCategoryWrappers.entries()) {
      if (wrapper) {
        wrapper.style.display = '';
        removeHighlightsFromCategory(wrapper);
      }
    }
    if (customCategorySearchInput) {
      const helpText = customCategorySearchInput.parentElement?.querySelector('.search-help-text');
      if (helpText) helpText.textContent = '';
    }
    return;
  }
  
  let visibleCount = 0;
  
  for (const [categoryName, wrapper] of customCategoryWrappers.entries()) {
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
  
  if (customCategorySearchInput) {
    const helpText = customCategorySearchInput.parentElement?.querySelector('.search-help-text');
    if (helpText) {
      if (visibleCount === 0) {
        helpText.textContent = `No se encontraron categorías para "${query}"`;
      } else {
        helpText.textContent = `${visibleCount} categoría${visibleCount !== 1 ? 's' : ''} encontrada${visibleCount !== 1 ? 's' : ''}`;
      }
    }
  }
}

function buildCustomCategorySearchBar() {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-category-search-wrapper';
  wrapper.style.cssText = 'padding:8px 12px;margin-bottom:8px;border-bottom:1px solid var(--modal-input-border);flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  
  const searchIcon = document.createElement('span');
  searchIcon.textContent = '🔍';
  searchIcon.style.cssText = 'font-size:14px;opacity:0.7;';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Buscar categorías...';
  input.className = 'custom-category-search-input';
  input.setAttribute('aria-label', 'Buscar categorías de emojis');
  input.style.cssText = 'flex:1;padding:8px 12px;border-radius:40px;border:1px solid var(--modal-input-border);background:var(--input-bg);color:var(--text-color);outline:none;font-size:14px;box-sizing:border-box;';
  input.setAttribute('autocomplete', 'off');
  
  const helpText = document.createElement('span');
  helpText.className = 'search-help-text';
  helpText.style.cssText = 'font-size:11px;color:var(--text-muted);';
  helpText.textContent = '';
  
  let debounce;
  input.addEventListener('input', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(debounce);
    const query = e.target.value.trim();
    debounce = setTimeout(() => {
      filterCustomCategories(query);
    }, 300);
  });
  
  wrapper.appendChild(searchIcon);
  wrapper.appendChild(input);
  wrapper.appendChild(helpText);
  
  customCategorySearchInput = input;
  
  return wrapper;
}

function createEmojiButton(emoji, onClick) {
  const btn = document.createElement('button');
  btn.className = 'emoji-item';
  btn.setAttribute('type', 'button');
  btn.setAttribute('draggable', 'false');
  btn.setAttribute('tabindex', '-1');
  btn.setAttribute('role', 'button');
  
  let displayEmoji = emoji;
  let insertEmoji = emoji;
  
  if (typeof emoji === 'string' && !emoji.startsWith(':')) {
    displayEmoji = applySkinToneToText(emoji);
    insertEmoji = displayEmoji;
    btn.setAttribute('aria-label', `Emoji ${displayEmoji}`);
  } else {
    btn.setAttribute('aria-label', `Emoji ${emoji.replace(/:/g, '')}`);
  }
  
  if (typeof emoji === 'string' && emoji.startsWith(':') && emoji.endsWith(':')) {
    const shortcode = emoji.slice(1, -1);
    const customData = getCustomEmojiData().find(e => e.shortcodes && e.shortcodes[0] === shortcode);
    if (customData) {
      if (customData.svg) {
        const svgWrapper = document.createElement('div');
        svgWrapper.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
        let svgHtml = customData.svg;
        if (svgHtml.includes('<svg')) {
          svgHtml = svgHtml.replace(/<svg/, '<svg style="width:100%; height:100%" contenteditable="false"');
        }
        svgWrapper.innerHTML = svgHtml;
        svgWrapper.setAttribute('data-shortcode', emoji);
        svgWrapper.setAttribute('contenteditable', 'false');
        btn.appendChild(svgWrapper);
      } else if (customData.url) {
        const img = document.createElement('img');
        img.src = customData.url;
        img.alt = customData.name;
        img.setAttribute('data-shortcode', emoji);
        img.style.cssText = 'width:32px;height:32px;vertical-align:middle;display:inline-block;object-fit:contain;border-radius:8px;';
        btn.appendChild(img);
      } else {
        btn.textContent = emoji;
      }
    } else {
      btn.textContent = emoji;
    }
  } else {
    btn.textContent = displayEmoji;
  }
  
  btn.setAttribute('data-emoji', emoji);
  
  btn.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
  
  btn.addEventListener('selectstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
  
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    addRecentEmoji(insertEmoji);
    if (onClick) onClick(insertEmoji);
    
    if (activeCategory === 'recent' && categorySections.has('recent')) {
      const recentSection = categorySections.get('recent');
      const newRecents = updateRecentCategory();
      const newGrid = buildGrid(newRecents, onClick);
      const oldGrid = recentSection.querySelector('.emoji-grid');
      if (oldGrid) oldGrid.replaceWith(newGrid);
    }
  });
  
  return btn;
}

function buildGrid(emojis, onClick) {
  debug.log(`[buildGrid] Construyendo grid con ${emojis.length} emojis`);
  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  const fragment = document.createDocumentFragment();
  if (emojis.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-category-message';
    emptyMsg.textContent = 'Esta categoría está vacía';
    emptyMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:14px;';
    fragment.appendChild(emptyMsg);
  } else {
    for (const emoji of emojis) {
      fragment.appendChild(createEmojiButton(emoji, onClick));
    }
  }
  grid.appendChild(fragment);
  return grid;
}

function buildSubcategoryAccordion(categoryName, emojis, onClick, isDisabled = false, icon = null) {
  debug.log(`[buildSubcategoryAccordion] Categoría: ${categoryName}, emojis: ${emojis?.length || 0}, isDisabled: ${isDisabled}`);
  
  if (isDisabled) {
    debug.log(`Saltando ${categoryName}: está DESHABILITADA`);
    return null;
  }
  
  const section = document.createElement('div');
  section.className = 'custom-category-item';
  section.style.marginBottom = '12px';
  
  const header = document.createElement('div');
  header.className = 'category-header';
  
  let iconHtml = '';
  if (icon) {
    if (icon.startsWith('<svg')) {
      iconHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:8px;">${icon}</span>`;
    } else {
      iconHtml = `<span style="margin-right:8px;">${icon}</span>`;
    }
  }
  
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      ${iconHtml}
      <strong>${escapeHtml(categoryName)}</strong>
      <span style="font-size: 11px; opacity: 0.7;">(${emojis?.length || 0})</span>
    </div>
  `;
  
  const content = document.createElement('div');
  content.className = 'category-content';
  content.appendChild(buildGrid(emojis || [], onClick));
  content.style.maxHeight = '0px';
  content.style.paddingTop = '0';
  
  let isExpanded = false;
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    debug.log(`Toggle categoría: ${categoryName}`);
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
  
  section.appendChild(header);
  section.appendChild(content);
  return section;
}

function ensureCategorySection(categoryKey, onClick) {
  debug.log(`[ensureCategorySection] Categoría: ${categoryKey}`);
  
  if (categorySections.has(categoryKey)) {
    debug.log(`${categoryKey} ya existe en cache`);
    return Promise.resolve(categorySections.get(categoryKey));
  }
  if (isLoadingCategory) {
    pendingCategory = categoryKey;
    debug.log(`${categoryKey} en espera (pendiente: ${pendingCategory})`);
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isLoadingCategory && categorySections.has(categoryKey)) {
          clearInterval(checkInterval);
          resolve(categorySections.get(categoryKey));
        }
      }, 50);
    });
  }
  
  isLoadingCategory = true;
  return new Promise((resolve) => {
    setTimeout(() => {
      debug.log(`Obteniendo datos para: ${categoryKey}`);
      const categoryData = getCategoryEmojis(categoryKey);
      let section = null;
      
      if (categoryKey === 'custom' && categoryData && categoryData.type === 'subcategories') {
        debug.log(`Procesando subcategorías de custom. Total: ${categoryData.data.length}`);
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-subcategories-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.width = '100%';
        wrapper.style.gap = '8px';
        
        const searchBar = buildCustomCategorySearchBar();
        wrapper.appendChild(searchBar);
        
        for (const subcat of categoryData.data) {
          debug.log(`  Subcategoría: ${subcat.name}, isStatic: ${subcat.isStatic}, emojis: ${subcat.emojis?.length || 0}`);
          const isDisabled = subcat.isStatic && isStaticCategoryDisabled(subcat.name);
          debug.log(`    isDisabled: ${isDisabled}`);
          if (isDisabled) {
            debug.log(`    Saltando ${subcat.name} (desactivada)`);
            continue;
          }
          const icon = subcat.categoryData?.icon || null;
          const subSection = buildSubcategoryAccordion(subcat.name, subcat.emojis, onClick, isDisabled, icon);
          if (subSection) {
            wrapper.appendChild(subSection);
            customCategoryWrappers.set(subcat.name, subSection);
            allCustomCategories.push(subcat.name);
          }
        }
        section = wrapper;
      } else {
        const emojis = categoryData;
        const titles = {
          recent: 'Recientes',
          custom: 'Personalizados',
          smileys: 'Smileys',
          people: 'People',
          animals: 'Animals',
          food: 'Food',
          travel: 'Travel',
          activities: 'Activities',
          objects: 'Objects',
          symbols: 'Symbols',
          flags: 'Flags'
        };
        debug.log(`Construyendo sección normal: ${titles[categoryKey] || categoryKey} con ${emojis?.length || 0} emojis`);
        section = buildSection(titles[categoryKey] || categoryKey, emojis, onClick, categoryKey);
      }
      
      if (section) {
        categorySections.set(categoryKey, section);
        section.style.display = 'none';
        gridContainer.appendChild(section);
        debug.log(`Sección ${categoryKey} añadida al DOM`);
      } else {
        debug.log(`No se pudo crear sección para ${categoryKey}`);
      }
      isLoadingCategory = false;
      if (pendingCategory && pendingCategory !== categoryKey) {
        debug.log(`Procesando categoría pendiente: ${pendingCategory}`);
        ensureCategorySection(pendingCategory, onClick).then(resolve);
        pendingCategory = null;
      } else {
        resolve(section);
      }
    }, 10);
  });
}

function buildSection(title, emojis, onClick, categoryKey = null) {
  if (!emojis || emojis.length === 0) {
    debug.log(`[buildSection] Construyendo "${title}" con 0 emojis (mostrando mensaje)`);
    const section = document.createElement('div');
    section.className = 'emoji-section';
    if (categoryKey) section.dataset.category = categoryKey;
    const titleDiv = document.createElement('div');
    titleDiv.className = 'emoji-section-title';
    titleDiv.textContent = title;
    section.appendChild(titleDiv);
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-category-message';
    emptyMsg.textContent = 'No hay emojis en esta categoría';
    emptyMsg.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:14px;';
    section.appendChild(emptyMsg);
    return section;
  }
  debug.log(`[buildSection] Construyendo "${title}" con ${emojis.length} emojis`);
  const section = document.createElement('div');
  section.className = 'emoji-section';
  if (categoryKey) section.dataset.category = categoryKey;
  const titleDiv = document.createElement('div');
  titleDiv.className = 'emoji-section-title';
  titleDiv.textContent = title;
  section.appendChild(titleDiv);
  section.appendChild(buildGrid(emojis, onClick));
  return section;
}

function showCategory(categoryKey) {
  debug.log(`[showCategory] Mostrando: ${categoryKey}`);
  
  if (categoryKey === 'custom' && customCategorySearchInput) {
    customCategorySearchInput.value = '';
    customCategorySearchQuery = '';
    for (const [_, wrapper] of customCategoryWrappers.entries()) {
      if (wrapper) {
        wrapper.style.display = '';
        removeHighlightsFromCategory(wrapper);
      }
    }
    const helpText = customCategorySearchInput.parentElement?.querySelector('.search-help-text');
    if (helpText) helpText.textContent = '';
  }
  
  if (!categorySections.has(categoryKey)) {
    debug.log(`${categoryKey} no está en cache, cargando...`);
    ensureCategorySection(categoryKey, currentOnEmojiClick).then(() => {
      if (activeCategory === categoryKey && searchQuery.length < 2) {
        for (const [key, section] of categorySections.entries()) {
          section.style.display = key === categoryKey ? 'flex' : 'none';
        }
        if (searchSection) searchSection.style.display = 'none';
        debug.log(`${categoryKey} mostrada después de carga`);
      }
    });
    return;
  }
  for (const [key, section] of categorySections.entries()) {
    section.style.display = key === categoryKey ? 'flex' : 'none';
  }
  if (searchSection) searchSection.style.display = 'none';
  debug.log(`${categoryKey} mostrada desde cache`);
}

function showSearch(results, query, onClick) {
  debug.log(`[showSearch] Query: "${query}", resultados: ${results.length}`);
  
  if (!searchSection) {
    searchSection = document.createElement('div');
    searchSection.className = 'emoji-search-results';
    gridContainer.insertBefore(searchSection, gridContainer.firstChild);
  }
  searchSection.innerHTML = '';
  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'emoji-section';
    empty.textContent = `No se encontraron resultados para "${query}"`;
    searchSection.appendChild(empty);
  } else {
    const section = buildSection(`🔍 Resultados (${results.length})`, results, onClick);
    if (section) searchSection.appendChild(section);
  }
  searchSection.style.display = 'flex';
  for (const section of categorySections.values()) {
    section.style.display = 'none';
  }
}

function refreshDisplay(onClick) {
  debug.log(`[refreshDisplay] searchQuery: "${searchQuery}", searchResults: ${searchResults?.length || 0}`);
  
  if (searchQuery.length >= 2 && searchResults) {
    showSearch(searchResults, searchQuery, onClick);
  } else {
    if (searchSection) searchSection.style.display = 'none';
    showCategory(activeCategory);
  }
  polyfillEmojis(gridContainer);
}

function buildSkinToneSelector(onToneChange) {
  const container = document.createElement('div');
  container.className = 'skin-tone-selector';
  
  const mainBtn = document.createElement('button');
  mainBtn.className = 'skin-tone-main';
  
  const toneIcons = {
    default: '🟡',
    light: '🏻',
    'medium-light': '🏼',
    medium: '🏽',
    'medium-dark': '🏾',
    dark: '🏿'
  };
  const currentTone = getSkinTone();
  mainBtn.innerHTML = `${toneIcons[currentTone] || '🟡'} <span style="font-size: 12px;">▼</span>`;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'skin-tone-dropdown';
  
  const tones = [
    { key: 'default', label: 'Predeterminado', icon: '🟡' },
    { key: 'light', label: 'Claro', icon: '🏻' },
    { key: 'medium-light', label: 'Claro medio', icon: '🏼' },
    { key: 'medium', label: 'Medio', icon: '🏽' },
    { key: 'medium-dark', label: 'Medio oscuro', icon: '🏾' },
    { key: 'dark', label: 'Oscuro', icon: '🏿' }
  ];
  
  tones.forEach(tone => {
    const btn = document.createElement('button');
    btn.className = 'skin-tone-option';
    btn.innerHTML = `${tone.icon} <span>${tone.label}</span>`;
    btn.addEventListener('click', () => {
      debug.log(`Ton de piel cambiado a: ${tone.label}`);
      setSkinTone(tone.key);
      mainBtn.innerHTML = `${tone.icon} <span style="font-size: 12px;">▼</span>`;
      dropdown.style.display = 'none';
      
      for (const [key, section] of categorySections.entries()) {
        if (section && key !== 'custom') {
          const oldGrid = section.querySelector('.emoji-grid');
          if (oldGrid) {
            const emojis = key === 'recent' ? updateRecentCategory() : getCategoryEmojis(key);
            const newGrid = buildGrid(emojis, currentOnEmojiClick);
            oldGrid.replaceWith(newGrid);
          }
        }
      }
      if (categorySections.has('custom')) {
        categorySections.get('custom').remove();
        categorySections.delete('custom');
        customCategoryWrappers.clear();
        allCustomCategories = [];
        ensureCategorySection('custom', currentOnEmojiClick).then(() => {
          if (activeCategory === 'custom') showCategory('custom');
          refreshDisplay(currentOnEmojiClick);
        });
      }
      if (activeCategory === 'recent' && categorySections.has('recent')) {
        const recentSection = categorySections.get('recent');
        const newRecents = updateRecentCategory();
        const newGrid = buildGrid(newRecents, currentOnEmojiClick);
        const oldGrid = recentSection.querySelector('.emoji-grid');
        if (oldGrid) oldGrid.replaceWith(newGrid);
      }
      refreshDisplay(currentOnEmojiClick);
      if (onToneChange) onToneChange(tone.key);
    });
    dropdown.appendChild(btn);
  });
  
  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'flex';
    dropdown.style.display = isVisible ? 'none' : 'flex';
  });
  
  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });
  
  container.appendChild(mainBtn);
  container.appendChild(dropdown);
  return container;
}

function buildCategoryBar(onCategorySelect, onEmojiClick) {
  debug.log(`[buildCategoryBar] Construyendo barra de categorías`);
  
  const bar = document.createElement('div');
  bar.className = 'custom-categories-bar';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Categorías de emojis');
  
  const categories = [
    { key: 'recent', name: 'Recientes', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { key: 'custom', name: 'Personalizados', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { key: 'smileys', name: 'Smileys Emotion', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
    { key: 'people', name: 'People Body', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
    { key: 'animals', name: 'Animals Nature', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M2 12h10"/><path d="M12 2a15 15 0 0 1 8 8"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/></svg>' },
    { key: 'food', name: 'Food Drink', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3L5 5"/><path d="M8 10L6 8"/><path d="M21 21L19 19"/><path d="M16 16L18 18"/><circle cx="12" cy="8" r="4"/><path d="M12 12v8"/><path d="M8 20h8"/></svg>' },
    { key: 'travel', name: 'Travel Places', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l3-9 3 9h3"/><path d="M5 6h7"/><path d="M3 12h18"/><path d="M12 21v-6"/><path d="M8 21h8"/></svg>' },
    { key: 'activities', name: 'Activities', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>' },
    { key: 'objects', name: 'Objects', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>' },
    { key: 'symbols', name: 'Symbols', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>' },
    { key: 'flags', name: 'Flags', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V3h10l2 4h6v12H6"/><path d="M6 9h14"/><path d="M6 13h10"/></svg>' }
  ];
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.innerHTML = cat.svg;
    btn.className = 'category-btn';
    btn.dataset.category = cat.key;
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', activeCategory === cat.key ? 'true' : 'false');
    btn.setAttribute('aria-label', `Categoría ${cat.name}`);
    btn.setAttribute('draggable', 'false');
    btn.setAttribute('tabindex', activeCategory === cat.key ? '0' : '-1');
    
    btn.style.cssText = `
      flex: 0 0 auto;
      padding: 8px;
      border-radius: 12px;
      background: ${activeCategory === cat.key ? 'var(--modal-btn-primary)' : 'transparent'};
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
      -webkit-user-drag: none;
      user-drag: none;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const svgElement = btn.querySelector('svg');
    if (svgElement) {
      svgElement.style.color = activeCategory === cat.key ? 'white' : 'currentColor';
    }
    
    btn.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    
    btn.addEventListener('selectstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      debug.log(`Click en categoría: ${cat.name} (${cat.key})`);
      
      if (activeCategory === cat.key && searchQuery === '') return;
      
      const focusState = preserveInputFocus();
      
      document.querySelectorAll('.category-btn').forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
        b.style.background = 'transparent';
        const svg = b.querySelector('svg');
        if (svg) svg.style.color = 'currentColor';
      });
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
      btn.style.background = 'var(--modal-btn-primary)';
      const currentSvg = btn.querySelector('svg');
      if (currentSvg) currentSvg.style.color = 'white';
      
      activeCategory = cat.key;
      searchQuery = '';
      searchResults = null;
      const searchInput = document.querySelector('.emoji-search-input');
      if (searchInput) searchInput.value = '';
      
      if (cat.key === 'custom') {
        debug.log(`Refrescando emojis personalizados...`);
        refreshCustomEmojis();
        if (categorySections.has('custom')) {
          categorySections.get('custom').remove();
          categorySections.delete('custom');
          customCategoryWrappers.clear();
          allCustomCategories = [];
          debug.log(`Sección custom eliminada del cache`);
        }
      }
      if (cat.key === 'recent') {
        updateRecentCategory();
        if (categorySections.has('recent')) {
          categorySections.get('recent').remove();
          categorySections.delete('recent');
        }
      }
      
      refreshDisplay(onEmojiClick);
      if (onCategorySelect) onCategorySelect(cat.key);
      if (scrollContainer) scrollContainer.scrollTop = 0;
      
      restoreInputFocus(focusState.wasFocused, focusState.input);
    });
    
    bar.appendChild(btn);
  });
  
  return bar;
}

function buildSearchBar(onSearch) {
  const wrapper = document.createElement('div');
  wrapper.className = 'emoji-search-wrapper';
  wrapper.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--modal-input-border);flex-shrink:0;';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Buscar emojis...';
  input.className = 'emoji-search-input';
  input.setAttribute('aria-label', 'Buscar emojis');
  input.style.cssText = 'width:100%;padding:10px 12px;border-radius:40px;border:1px solid var(--modal-input-border);background:var(--input-bg);color:var(--text-color);outline:none;font-size:14px;box-sizing:border-box;';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('tabindex', '0');
  
  let debounce;
  input.addEventListener('input', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const query = e.target.value.trim();
      debug.log(`Búsqueda global: "${query}"`);
      searchQuery = query;
      if (query.length >= 2) {
        searchResults = searchEmojis(query);
        debug.log(`Resultados de búsqueda: ${searchResults.length}`);
      } else {
        searchResults = null;
      }
      refreshDisplay(currentOnEmojiClick);
      if (scrollContainer) scrollContainer.scrollTop = 0;
      if (onSearch) onSearch(query, searchResults);
    }, 300);
  });
  
  wrapper.appendChild(input);
  return wrapper;
}

export function initEmojiPicker(container, onEmojiClick, onCategoryChange = null) {
  debug.log(`[initEmojiPicker] INICIANDO PICKER`);
  
  if (!container) {
    debug.logError(`Container no existe`);
    return null;
  }
  
  debug.log(`Cargando emojis personalizados...`);
  loadCustomEmojis();
  updateRecentCategory();
  
  container.innerHTML = '';
  currentOnEmojiClick = onEmojiClick;
  
  scrollContainer = document.createElement('div');
  scrollContainer.className = 'emoji-scroll-container';
  scrollContainer.style.cssText = 'flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;';
  scrollContainer.setAttribute('role', 'region');
  scrollContainer.setAttribute('aria-label', 'Selector de emojis');
  
  debug.log(`Construyendo componentes UI...`);
  const categoryBar = buildCategoryBar((catKey) => {
    if (onCategoryChange) onCategoryChange(catKey);
  }, onEmojiClick);
  const searchBar = buildSearchBar(onEmojiClick);
  const skinToneSelector = buildSkinToneSelector(() => {});
  
  gridContainer = document.createElement('div');
  gridContainer.className = 'emoji-picker-grid-container';
  gridContainer.style.cssText = 'display:flex;flex-direction:column;flex:1;';
  
  scrollContainer.appendChild(categoryBar);
  scrollContainer.appendChild(skinToneSelector);
  scrollContainer.appendChild(searchBar);
  scrollContainer.appendChild(gridContainer);
  container.appendChild(scrollContainer);
  
  const categories = ['recent', 'custom', 'smileys', 'people', 'animals', 'food', 'travel', 'activities', 'objects', 'symbols', 'flags'];
  debug.log(`Cargando ${categories.length} categorías...`);
  categories.forEach(cat => ensureCategorySection(cat, onEmojiClick));
  
  showCategory(activeCategory);
  
  polyfillEmojis(gridContainer);
  
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      if (scrollContainer) scrollContainer.style.overflowY = 'auto';
    });
    resizeObserver.observe(scrollContainer);
  }
  
  window._refreshCustomEmojis = () => {
    debug.log(`[_refreshCustomEmojis] Callback llamado`);
    refreshCustomEmojis();
    if (categorySections.has('custom')) {
      categorySections.get('custom').remove();
      categorySections.delete('custom');
      customCategoryWrappers.clear();
      allCustomCategories = [];
    }
    ensureCategorySection('custom', onEmojiClick).then(() => {
      if (activeCategory === 'custom') showCategory('custom');
      refreshDisplay(onEmojiClick);
    });
  };
  
  window._updateRecentCategory = (newRecents) => {
    debug.log(`[_updateRecentCategory] Actualizando recientes: ${newRecents.length} emojis`);
    if (categorySections.has('recent')) {
      const recentSection = categorySections.get('recent');
      const newGrid = buildGrid(newRecents, onEmojiClick);
      const oldGrid = recentSection.querySelector('.emoji-grid');
      if (oldGrid) oldGrid.replaceWith(newGrid);
    }
  };
  
  debug.logSuccess(`[initEmojiPicker] PICKER INICIADO CORRECTAMENTE`);
  
  return {
    refresh: () => {
      debug.log(`refresh() llamado`);
      refreshDisplay(onEmojiClick);
    },
    refreshRecent: () => {
      debug.log(`refreshRecent() llamado`);
      updateRecentCategory();
      if (categorySections.has('recent')) {
        const recentSection = categorySections.get('recent');
        const newRecents = updateRecentCategory();
        const newGrid = buildGrid(newRecents, onEmojiClick);
        const oldGrid = recentSection.querySelector('.emoji-grid');
        if (oldGrid) oldGrid.replaceWith(newGrid);
      }
    },
    setCategory: (cat) => {
      debug.log(`setCategory() a: ${cat}`);
      if (activeCategory === cat) return;
      activeCategory = cat;
      searchQuery = '';
      searchResults = null;
      const searchInput = document.querySelector('.emoji-search-input');
      if (searchInput) searchInput.value = '';
      if (cat === 'custom') {
        if (customCategorySearchInput) {
          customCategorySearchInput.value = '';
          customCategorySearchQuery = '';
          for (const [_, wrapper] of customCategoryWrappers.entries()) {
            if (wrapper) {
              wrapper.style.display = '';
              removeHighlightsFromCategory(wrapper);
            }
          }
          const helpText = customCategorySearchInput.parentElement?.querySelector('.search-help-text');
          if (helpText) helpText.textContent = '';
        }
      }
      refreshDisplay(onEmojiClick);
      if (scrollContainer) scrollContainer.scrollTop = 0;
      document.querySelectorAll('.category-btn').forEach(btn => {
        const isSelected = btn.dataset.category === cat;
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
        btn.style.background = isSelected ? 'var(--modal-btn-primary)' : 'transparent';
      });
    },
    scrollToTop: () => {
      if (scrollContainer) scrollContainer.scrollTop = 0;
    }
  };
}

export function destroyEmojiPicker() {
  debug.log(`[destroyEmojiPicker] Destruyendo picker`);
  if (gridContainer) gridContainer.innerHTML = '';
  categorySections.clear();
  searchSection = null;
  if (resizeObserver) resizeObserver.disconnect();
  scrollContainer = null;
  gridContainer = null;
  searchQuery = '';
  searchResults = null;
  currentOnEmojiClick = null;
  isLoadingCategory = false;
  pendingCategory = null;
  customCategorySearchInput = null;
  customCategorySearchQuery = '';
  customCategoryWrappers.clear();
  allCustomCategories = [];
  if (window._refreshCustomEmojis) delete window._refreshCustomEmojis;
  if (window._updateRecentCategory) delete window._updateRecentCategory;
  debug.logSuccess(`Picker destruido`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}