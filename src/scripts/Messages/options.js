import { isStickerSaved, getStickerCategoryByUrl, getAllStickers, getCategories, canCreateCategory, createCategory, addCustomSticker, removeCustomSticker, refreshStickersInPicker, isCategoryDisabled } from '../Stickers/StickerManager.js';
import { showNotification } from '../Utils/notifications.js';

let currentMenu = null;
let confirmPopup = null;
let categorySelectorModal = null;

function showTransientNotification(text, duration = 2000) {
  showNotification(text, duration);
}

function showConfirmPopup(message) {
  return new Promise((resolve) => {
    if (confirmPopup) {
      confirmPopup.remove();
      confirmPopup = null;
    }
    confirmPopup = document.createElement('div');
    confirmPopup.className = 'confirm-popup';
    confirmPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e2e;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 20000;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 250px;
      text-align: center;
      border: 1px solid #3a3a4a;
    `;
    confirmPopup.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: #e0e0e0;">${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px;">
        <button class="confirm-no" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #ef4444;">✗</button>
        <button class="confirm-yes" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #10b981;">✓</button>
      </div>
    `;
    document.body.appendChild(confirmPopup);
    confirmPopup.querySelector('.confirm-no').addEventListener('click', () => {
      confirmPopup.remove();
      confirmPopup = null;
      resolve(false);
    });
    confirmPopup.querySelector('.confirm-yes').addEventListener('click', () => {
      confirmPopup.remove();
      confirmPopup = null;
      resolve(true);
    });
  });
}

function showCreateCategoryModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay';
    overlay.style.zIndex = '30001';
    document.body.appendChild(overlay);
    overlay.classList.add('visible');
    const modalDiv = document.createElement('div');
    modalDiv.className = 'add-reaction-modal enter';
    modalDiv.style.zIndex = '30002';
    modalDiv.style.width = '300px';
    modalDiv.innerHTML = `
      <div class="add-reaction-card" style="padding: 20px; background: #1e1e2e; border-radius: 20px;">
        <h1 style="font-size: 18px; margin-bottom: 16px; color: #e0e0e0;">Nueva categoría</h1>
        <input type="text" id="new-category-name" placeholder="Nombre (máx 20 caracteres)" maxlength="20" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #3a3a4a; background: #2a2a3a; color: #e0e0e0; margin-bottom: 20px;">
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancel-category" class="btn-cancel">Cancelar</button>
          <button id="create-category" class="btn primary">Crear</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    modalDiv.style.left = '50%';
    modalDiv.style.top = '50%';
    modalDiv.style.transform = 'translate(-50%, -50%)';
    const input = modalDiv.querySelector('#new-category-name');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
    const cleanup = () => {
      modalDiv.classList.add('leave');
      overlay.classList.remove('visible');
      setTimeout(() => {
        modalDiv.remove();
        overlay.remove();
      }, 200);
    };
    modalDiv.querySelector('#cancel-category').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    modalDiv.querySelector('#create-category').addEventListener('click', () => {
      const name = input.value.trim();
      if (name) {
        cleanup();
        resolve(name);
      } else {
        showTransientNotification('El nombre no puede estar vacío', 1500);
      }
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = input.value.trim();
        if (name) {
          cleanup();
          resolve(name);
        }
      }
    });
  });
}

function showCategorySelectorForSave(stickerUrl, stickerName) {
  const categories = getCategories().filter(c => !c.isLocalCategory);
  if (categorySelectorModal) {
    categorySelectorModal.remove();
    categorySelectorModal = null;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-blur-overlay';
  overlay.style.zIndex = '20003';
  document.body.appendChild(overlay);
  overlay.classList.add('visible');
  const selectorModal = document.createElement('div');
  selectorModal.className = 'add-reaction-modal enter';
  selectorModal.style.zIndex = '20004';
  selectorModal.style.width = '300px';
  let html = `
    <div class="add-reaction-card" style="padding: 20px; background: #1e1e2e; border-radius: 20px;">
      <h1 style="font-size: 18px; margin-bottom: 16px; color: #e0e0e0;">📁 Guardar sticker en categoría</h1>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
  `;
  if (categories.length === 0) {
    html += `<p style="color: #a0a0b0; text-align: center;">No hay categorías. Crea una nueva.</p>`;
  } else {
    categories.forEach(cat => {
      const canAdd = cat.stickers.length < 30;
      html += `
        <button class="category-save-btn btn" data-category="${escapeHtml(cat.name)}" style="text-align: left; display: flex; justify-content: space-between; align-items: center; background: #2a2a3a; border: none; border-radius: 12px; padding: 10px; margin: 4px 0; cursor: pointer; color: #e0e0e0;" ${!canAdd ? 'disabled style="opacity:0.5;"' : ''}>
          <span>📁 ${escapeHtml(cat.name)}</span>
          <span style="font-size: 12px;">(${cat.stickers.length}/30)</span>
        </button>
      `;
    });
  }
  html += `
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="create-new-category-from-selector" class="btn" style="flex:1; background: #3a3a4a; border: none; border-radius: 40px; padding: 10px; cursor: pointer; color: #e0e0e0;">+ Nueva categoría</button>
        <button id="cancel-selector" class="btn-cancel">Cancelar</button>
      </div>
    </div>
  `;
  selectorModal.innerHTML = html;
  document.body.appendChild(selectorModal);
  selectorModal.style.left = '50%';
  selectorModal.style.top = '50%';
  selectorModal.style.transform = 'translate(-50%, -50%)';
  categorySelectorModal = selectorModal;
  const cleanup = () => {
    if (selectorModal) {
      selectorModal.classList.add('leave');
      setTimeout(() => {
        if (selectorModal && selectorModal.parentNode) selectorModal.parentNode.removeChild(selectorModal);
        categorySelectorModal = null;
      }, 200);
    }
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    }
  };
  selectorModal.querySelectorAll('.category-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const categoryName = btn.dataset.category;
      const category = getCategories().find(c => c.name === categoryName);
      if (category && category.stickers.length >= 30) {
        showTransientNotification(`La categoría "${categoryName}" está llena.`, 2000);
        return;
      }
      try {
        const id = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await addCustomSticker({
          id: id,
          url: stickerUrl,
          name: stickerName || 'Sticker',
          animated: false
        }, categoryName);
        showTransientNotification('✅ Sticker guardado correctamente', 2000);
        if (window._refreshStickers) window._refreshStickers();
        cleanup();
      } catch (err) {
        showTransientNotification('Error: ' + err.message, 3000);
      }
    });
  });
  selectorModal.querySelector('#create-new-category-from-selector').addEventListener('click', async () => {
    const name = await showCreateCategoryModal();
    if (name) {
      try {
        createCategory(name.trim().substring(0, 20));
        showTransientNotification(`Categoría "${name}" creada`, 2000);
        cleanup();
        showCategorySelectorForSave(stickerUrl, stickerName);
      } catch (err) {
        showTransientNotification(err.message, 2000);
      }
    }
  });
  selectorModal.querySelector('#cancel-selector').addEventListener('click', () => {
    cleanup();
  });
}

export function showOptionsMenu(messageEl, coords, isMe, callback) {
  hideOptionsMenu();

  const menu = document.createElement('div');
  menu.className = 'options-menu enter';
  const list = document.createElement('div');
  list.className = 'options-list';

  function addItem(label, actionKey, svgPath) {
    const btn = document.createElement('button');
    btn.className = 'options-item';
    
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '12px';
    
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
    edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-7 7H10v-4l7-7z"/><path d="M4 20h16"/><path d="M12 10L4 18v4h4l8-8"/></svg>`,
    addSticker: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="10"/></svg>`,
    deleteSticker: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/><circle cx="12" cy="12" r="10"/></svg>`
  };
  const dragWrap = messageEl.querySelector('.msg-drag');
  const isSticker = dragWrap && dragWrap.classList.contains('sticker-message-wrapper');
  const stickerUrl = isSticker ? dragWrap.dataset.stickerUrl : null;
  const stickerSaved = isSticker && stickerUrl ? isStickerSaved(stickerUrl) : false;

  addItem('Copiar', 'copy', svgs.copy);
  addItem('Reenviar', 'forward', svgs.forward);
  addItem('Eliminar', 'delete', svgs.delete);
  if (isMe) addItem('Eliminar para todos', 'deleteForAll', svgs.deleteForAll);
  if (isMe && !isSticker) addItem('Editar', 'edit', svgs.edit);
  
  if (isSticker) {
    if (stickerSaved) {
      addItem('Eliminar sticker', 'deleteSticker', svgs.deleteSticker);
    } else {
      addItem('Añadir sticker', 'addSticker', svgs.addSticker);
    }
  }

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

export function handleStickerOption(action, stickerUrl, stickerName) {
  if (action === 'addSticker' && stickerUrl) {
    showCategorySelectorForSave(stickerUrl, stickerName);
  }
}

export function handleDeleteSticker(stickerUrl) {
  const category = getStickerCategoryByUrl(stickerUrl);
  if (category) {
    showConfirmPopup('¿Eliminar este sticker de tus guardados?').then(async (confirmed) => {
      if (confirmed) {
        const allStickers = getAllStickers();
        const sticker = allStickers.find(s => s.url === stickerUrl);
        if (sticker && sticker.id) {
          await removeCustomSticker(category, sticker.id);
          showTransientNotification('Sticker eliminado de tus guardados');
          refreshStickersInPicker();
        } else {
          showTransientNotification('No se pudo encontrar el sticker', 2000);
        }
      }
    });
  } else {
    showTransientNotification('No se pudo encontrar la categoría del sticker', 2000);
  }
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}