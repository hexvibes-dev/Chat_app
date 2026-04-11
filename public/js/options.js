let currentMenu = null;

export function showOptionsMenu(messageEl, coords, isMe, callback) {
  hideOptionsMenu();

  const menu = document.createElement('div');
  menu.className = 'options-menu enter';
  const list = document.createElement('div');
  list.className = 'options-list';

  function addItem(label, actionKey) {
    const btn = document.createElement('button');
    btn.className = 'options-item';
    btn.innerText = label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      callback(actionKey);
    });
    list.appendChild(btn);
  }

  addItem('Copiar', 'copy');
  addItem('Reenviar', 'forward');
  addItem('Eliminar', 'delete');
  if (isMe) addItem('Eliminar para todos', 'deleteForAll');
  if (isMe) addItem('Editar', 'edit');

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
