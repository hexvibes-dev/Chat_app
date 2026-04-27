// src/scripts/editor/EmojiSearch.js

import { searchEmojis } from './EmojiData.js';

let searchInput = null;
let searchContainer = null;
let onSearchResults = null;
let currentQuery = '';

export function createSearchBar(onResults) {
  onSearchResults = onResults;
  
  searchContainer = document.createElement('div');
  searchContainer.className = 'emoji-search-container';
  
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Buscar emojis...';
  searchInput.className = 'emoji-search-input';
  
  searchInput.addEventListener('input', (e) => {
    currentQuery = e.target.value.trim();
    performSearch();
  });
  
  searchContainer.appendChild(searchInput);
  return searchContainer;
}

export function performSearch() {
  if (!onSearchResults) return;
  
  if (currentQuery && currentQuery.length >= 2) {
    const results = searchEmojis(currentQuery);
    onSearchResults(results, currentQuery);
  } else {
    onSearchResults(null, '');
  }
}

export function clearSearch() {
  if (searchInput) {
    searchInput.value = '';
    currentQuery = '';
    performSearch();
  }
}

export function getSearchQuery() {
  return currentQuery;
}