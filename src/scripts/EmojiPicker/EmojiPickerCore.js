// src/scripts/editor/EmojiPickerCore.js

import { getCategoryEmojis, addRecentEmoji, getRecentEmojis, searchEmojis, getCustomEmojiData, loadCustomEmojis, refreshCustomEmojis, updateRecentCategory } from './EmojiData.js';
import { polyfillEmojis, setSkinTone, getSkinTone, applySkinToneToEmoji } from './emojiPolyfill.js';

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
    displayEmoji = applySkinToneToEmoji(emoji);
    insertEmoji = displayEmoji;
    btn.setAttribute('aria-label', `Emoji ${displayEmoji}`);
  } else {
    btn.setAttribute('aria-label', `Emoji ${emoji.replace(/:/g, '')}`);
  }
  
  if (typeof emoji === 'string' && emoji.startsWith(':') && emoji.endsWith(':')) {
    const shortcode = emoji.slice(1, -1);
    const customData = getCustomEmojiData().find(e => e.shortcodes[0] === shortcode);
    if (customData && customData.url) {
      const img = document.createElement('img');
      img.src = customData.url;
      img.alt = customData.name;
      img.setAttribute('data-shortcode', emoji);
      img.style.cssText = 'width:32px;height:32px;vertical-align:middle;display:inline-block;object-fit:contain;border-radius:8px;';
      btn.appendChild(img);
    } else {
      btn.textContent = displayEmoji;
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
    
    const focusState = preserveInputFocus();
    
    addRecentEmoji(insertEmoji);
    if (onClick) onClick(insertEmoji);
    
    if (activeCategory === 'recent' && categorySections.has('recent')) {
      const recentSection = categorySections.get('recent');
      const newRecents = updateRecentCategory();
      const newGrid = buildGrid(newRecents, onClick);
      const oldGrid = recentSection.querySelector('.emoji-grid');
      if (oldGrid) oldGrid.replaceWith(newGrid);
    }
    
    restoreInputFocus(focusState.wasFocused, focusState.input);
  });
  
  return btn;
}

function buildGrid(emojis, onClick) {
  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  const fragment = document.createDocumentFragment();
  for (const emoji of emojis) {
    fragment.appendChild(createEmojiButton(emoji, onClick));
  }
  grid.appendChild(fragment);
  return grid;
}

function buildSubcategoryAccordion(categoryName, emojis, onClick) {
  if (!emojis || emojis.length === 0) return null;
  
  const section = document.createElement('div');
  section.className = 'custom-category-item';
  section.style.marginBottom = '12px';
  
  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="category-arrow" style="font-size: 14px;">▼</span>
      <strong>${escapeHtml(categoryName)}</strong>
    </div>
  `;
  
  const content = document.createElement('div');
  content.className = 'category-content';
  content.appendChild(buildGrid(emojis, onClick));
  content.style.maxHeight = '0px';
  content.style.paddingTop = '0';
  
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
  
  section.appendChild(header);
  section.appendChild(content);
  return section;
}

function ensureCategorySection(categoryKey, onClick) {
  if (categorySections.has(categoryKey)) return Promise.resolve(categorySections.get(categoryKey));
  if (isLoadingCategory) {
    pendingCategory = categoryKey;
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
      const categoryData = getCategoryEmojis(categoryKey);
      let section = null;
      
      if (categoryKey === 'custom' && categoryData && categoryData.type === 'subcategories') {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-subcategories-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.width = '100%';
        wrapper.style.gap = '8px';
        
        for (const subcat of categoryData.data) {
          const subSection = buildSubcategoryAccordion(subcat.name, subcat.emojis, onClick);
          if (subSection) wrapper.appendChild(subSection);
        }
        section = wrapper;
      } else {
        const emojis = categoryData;
        const titles = {
          recent: '🕒 Recientes',
          custom: '⭐ Personalizados',
          smileys: '😀 Smileys & Emotion',
          people: '👋 People & Body',
          animals: '🐶 Animals & Nature',
          food: '🍕 Food & Drink',
          travel: '✈️ Travel & Places',
          activities: '⚽ Activities',
          objects: '💡 Objects',
          symbols: '🔣 Symbols',
          flags: '🏁 Flags'
        };
        section = buildSection(titles[categoryKey] || categoryKey, emojis, onClick, categoryKey);
      }
      
      if (section) {
        categorySections.set(categoryKey, section);
        section.style.display = 'none';
        gridContainer.appendChild(section);
      }
      isLoadingCategory = false;
      if (pendingCategory && pendingCategory !== categoryKey) {
        ensureCategorySection(pendingCategory, onClick).then(resolve);
        pendingCategory = null;
      } else {
        resolve(section);
      }
    }, 10);
  });
}

function buildSection(title, emojis, onClick, categoryKey = null) {
  if (!emojis || emojis.length === 0) return null;
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
  if (!categorySections.has(categoryKey)) {
    ensureCategorySection(categoryKey, currentOnEmojiClick).then(() => {
      if (activeCategory === categoryKey && searchQuery.length < 2) {
        for (const [key, section] of categorySections.entries()) {
          section.style.display = key === categoryKey ? 'flex' : 'none';
        }
        if (searchSection) searchSection.style.display = 'none';
      }
    });
    return;
  }
  for (const [key, section] of categorySections.entries()) {
    section.style.display = key === categoryKey ? 'flex' : 'none';
  }
  if (searchSection) searchSection.style.display = 'none';
}

function showSearch(results, query, onClick) {
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
  const bar = document.createElement('div');
  bar.className = 'custom-categories-bar';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Categorías de emojis');
  
  const categories = [
    { key: 'recent', icon: '🕒', name: 'Recientes' },
    { key: 'custom', icon: '⭐', name: 'Personalizados' },
    { key: 'smileys', icon: '😀', name: 'Smileys' },
    { key: 'people', icon: '👋', name: 'People' },
    { key: 'animals', icon: '🐶', name: 'Animals' },
    { key: 'food', icon: '🍕', name: 'Food' },
    { key: 'travel', icon: '✈️', name: 'Travel' },
    { key: 'activities', icon: '⚽', name: 'Activities' },
    { key: 'objects', icon: '💡', name: 'Objects' },
    { key: 'symbols', icon: '🔣', name: 'Symbols' },
    { key: 'flags', icon: '🏁', name: 'Flags' }
  ];
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat.icon;
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
      font-size: 22px;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
      -webkit-user-drag: none;
      user-drag: none;
    `;
    
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
      if (activeCategory === cat.key && searchQuery === '') return;
      
      const focusState = preserveInputFocus();
      
      document.querySelectorAll('.category-btn').forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
        b.style.background = 'transparent';
      });
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
      btn.style.background = 'var(--modal-btn-primary)';
      
      activeCategory = cat.key;
      searchQuery = '';
      searchResults = null;
      const searchInput = document.querySelector('.emoji-search-input');
      if (searchInput) searchInput.value = '';
      
      if (cat.key === 'custom') {
        refreshCustomEmojis();
        if (categorySections.has('custom')) {
          categorySections.get('custom').remove();
          categorySections.delete('custom');
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
      searchQuery = query;
      if (query.length >= 2) {
        searchResults = searchEmojis(query);
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
  if (!container) return null;
  
  loadCustomEmojis();
  updateRecentCategory();
  container.innerHTML = '';
  currentOnEmojiClick = onEmojiClick;
  
  scrollContainer = document.createElement('div');
  scrollContainer.className = 'emoji-scroll-container';
  scrollContainer.style.cssText = 'flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;';
  scrollContainer.setAttribute('role', 'region');
  scrollContainer.setAttribute('aria-label', 'Selector de emojis');
  
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
    refreshCustomEmojis();
    if (categorySections.has('custom')) {
      categorySections.get('custom').remove();
      categorySections.delete('custom');
    }
    ensureCategorySection('custom', onEmojiClick).then(() => {
      if (activeCategory === 'custom') showCategory('custom');
      refreshDisplay(onEmojiClick);
    });
  };
  
  window._updateRecentCategory = (newRecents) => {
    if (categorySections.has('recent')) {
      const recentSection = categorySections.get('recent');
      const newGrid = buildGrid(newRecents, onEmojiClick);
      const oldGrid = recentSection.querySelector('.emoji-grid');
      if (oldGrid) oldGrid.replaceWith(newGrid);
    }
  };
  
  return {
    refresh: () => refreshDisplay(onEmojiClick),
    setCategory: (cat) => {
      if (activeCategory === cat) return;
      activeCategory = cat;
      searchQuery = '';
      searchResults = null;
      const searchInput = document.querySelector('.emoji-search-input');
      if (searchInput) searchInput.value = '';
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
  if (window._refreshCustomEmojis) delete window._refreshCustomEmojis;
  if (window._updateRecentCategory) delete window._updateRecentCategory;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}