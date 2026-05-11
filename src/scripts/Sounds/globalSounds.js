import { playClick, playButtonHover } from './soundManager.js';

let isInitialized = false;

function isExcludedElement(element) {
  if (!element) return true;
  if (element.classList?.contains('no-sound')) return true;
  if (element.classList?.contains('react-emoji')) return true;
  if (element.classList?.contains('reaction-badge')) return true;
  if (element.closest('.reactions-popup')) return true;
  if (element.closest('.options-menu')) return true;
  if (element.closest('.emoji-picker-content')) return true;
  if (element.closest('.stickers-grid')) return true;
  if (element.closest('.gifs-grid')) return true;
  if (element.id === 'input') return true;
  if (element.id === 'emojiPickerBtn') return true;
  if (element.id === 'actionMenuBtn') return true;
  if (element.id === 'hamburgerBtn') return true;
  if (element.id === 'scrollToBottomBtn') return true;
  return false;
}

function handleClick(e) {
  const target = e.target;
  const button = target.closest('button');
  
  if (!button) return;
  if (isExcludedElement(button)) return;
  
  playClick();
}

function handleMouseEnter(e) {
  const target = e.target;
  const button = target.closest('button');
  
  if (!button) return;
  if (isExcludedElement(button)) return;
  
  playButtonHover();
}

export function initGlobalSounds() {
  if (isInitialized) return;
  
  document.addEventListener('click', handleClick);
  document.addEventListener('mouseenter', handleMouseEnter);
  
  isInitialized = true;
}