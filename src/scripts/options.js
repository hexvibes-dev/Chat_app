// src/scripts/options.js

let currentMenu = null;

export function showOptionsMenu(messageEl, coords, isMe, callback) {
  hideOptionsMenu();

  const menu = document.createElement('div');
  menu.className = 'options-menu enter';
  const list = document.createElement('div');
  list.className = 'options-list';

  function addItem(label, actionKey, svgPath) {
    const btn = document.createElement('button');
    btn.className = 'options-item';
    
    // Crear contenedor para SVG y texto
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '12px';
    
    // Agregar SVG
    if (svgPath) {
      const svgContainer = document.createElement('div');
      svgContainer.style.width = '20px';
      svgContainer.style.height = '20px';
      svgContainer.style.display = 'flex';
      svgContainer.style.alignItems = 'center';
      svgContainer.style.justifyContent = 'center';
      svgContainer.innerHTML = svgPath;
      content.appendChild(svgContainer);
    }
    
    // Agregar texto
    const textSpan = document.createElement('span');
    textSpan.textContent = label;
    content.appendChild(textSpan);
    
    btn.appendChild(content);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      callback(actionKey);
    });
    list.appendChild(btn);
  }

  const svgs = {
    copy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    forward: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7" /></svg>`,
    delete: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    deleteForAll: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-7 7H10v-4l7-7z"/><path d="M4 20h16"/><path d="M12 10L4 18v4h4l8-8"/></svg>`
  };

  addItem('Copiar', 'copy', svgs.copy);
  addItem('Reenviar', 'forward', svgs.forward);
  addItem('Eliminar', 'delete', svgs.delete);
  if (isMe) addItem('Eliminar para todos', 'deleteForAll', svgs.deleteForAll);
  if (isMe) addItem('Editar', 'edit', svgs.edit);

  menu.appendChild(list);
  document.body.appendChild(menu);

  menu.style.left = coords.left + 'px';
  menu.style.top = coords.top + 'px';
  menu.classList.remove('enter');

  currentMenu = menu;

  setTimeout(() => {
    window.addEventListener('pointerdown', onOutside);
  }, 0);
}

function onOutside(e) {
  if (!currentMenu) return;
  const target = e.target;
  if (!target) return;
  if (target.closest('.options-menu') || target.closest('.reactions-popup')) return;
  hideOptionsMenu();
}

export function hideOptionsMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }
  window.removeEventListener('pointerdown', onOutside);
}