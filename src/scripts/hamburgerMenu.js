// src/scripts/hamburgerMenu.js
import { initThemeManager } from './themeManager.js';

let menuElement = null;
let isMenuOpen = false;

export function initHamburgerMenu() {
  initThemeManager();
  createMenuStructure();
  attachEvents();
}

function createMenuStructure() {
  const container = document.getElementById('hamburgerMenuContainer');
  if (!container) return;
  const menu = document.createElement('div');
  menu.className = 'hamburger-menu';
  menu.style.display = 'none';
  menu.innerHTML = `<ul><li><button id="themeOptionBtn">Cambiar tema</button></li></ul>`;
  container.appendChild(menu);
  menuElement = menu;
}

function attachEvents() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  if (!hamburgerBtn) return;
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  const themeBtn = document.getElementById('themeOptionBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      closeMenu();
      if (typeof window.showThemeModal === 'function') {
        window.showThemeModal();
      } else {
        console.error('showThemeModal no está definido. Asegúrate de que Chat.astro haya cargado el script.');
      }
    });
  }
  document.addEventListener('click', (e) => {
    if (isMenuOpen && menuElement && !menuElement.contains(e.target) && e.target !== hamburgerBtn) {
      closeMenu();
    }
  });
}

function toggleMenu() {
  if (isMenuOpen) closeMenu();
  else openMenu();
}
function openMenu() {
  if (!menuElement) return;
  menuElement.style.display = 'block';
  menuElement.classList.remove('leave');
  menuElement.classList.add('enter');
  isMenuOpen = true;
}
function closeMenu() {
  if (!menuElement) return;
  menuElement.classList.remove('enter');
  menuElement.classList.add('leave');
  setTimeout(() => {
    if (menuElement && !menuElement.classList.contains('enter')) {
      menuElement.style.display = 'none';
    }
  }, 200);
  isMenuOpen = false;
}