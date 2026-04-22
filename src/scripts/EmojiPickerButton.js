import interact from 'interactjs';
import { showEmojiPicker, hideEmojiPicker } from './EmojiPicker.js';
import { registerModal, unregisterModal, bringModalToFront } from './modalStackManager.js';

let modalContainer = null;
let isOpen = false;
let isAnimating = false;
let container = null;
let header = null;
let closeBtn = null;
let windowX = 0, windowY = 0;
let modalId = 'emoji-picker-modal';

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function createModal() {
  if (modalContainer) return modalContainer;
  
  modalContainer = document.createElement('div');
  modalContainer.id = 'emoji-picker-modal';
  modalContainer.className = 'action-menu-modal';
  modalContainer.innerHTML = `
    <div class="action-menu-container" id="emoji-picker-container" style="width: 400px; height: 500px;">
      <div class="action-menu-header" id="emoji-picker-header">
        <h3>Emojis</h3>
        <button class="action-menu-close" id="emoji-picker-close">&times;</button>
      </div>
      <div class="action-menu-content" id="emoji-picker-content" style="padding: 0; overflow: hidden; flex: 1;">
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  container = modalContainer.querySelector('.action-menu-container');
  header = modalContainer.querySelector('#emoji-picker-header');
  closeBtn = modalContainer.querySelector('#emoji-picker-close');
  const contentDiv = modalContainer.querySelector('#emoji-picker-content');
  
  addResizeHandles(container);
  setupInteract(container, header);
  
  closeBtn.addEventListener('click', () => hideModal());
  
  registerModal(modalContainer, modalId);
  
  showEmojiPicker(contentDiv);
  
  return modalContainer;
}

function setupInteract(element, dragHandle) {
  interact(element).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 200, height: 250 },
        max: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
      })
    ],
    listeners: {
      move(event) {
        let width = event.rect.width;
        let height = event.rect.height;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
        
        const contentDiv = document.getElementById('emoji-picker-content');
        if (contentDiv) {
          const newContentHeight = height - 60;
          contentDiv.style.height = `${newContentHeight}px`;
        }
      }
    }
  });
  
  interact(dragHandle).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: dragHandle,
    preventDefault: 'always',
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    listeners: {
      start() { window.isDraggingModal = true; },
      move(event) {
        windowX += event.dx;
        windowY += event.dy;
        
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
      },
      end() { 
        window.isDraggingModal = false;
      }
    }
  });
}

function showModal() {
  if (isOpen || isAnimating) return;
  const modalEl = createModal();
  isOpen = true;
  modalEl.classList.remove('closing');
  modalEl.style.display = 'flex';
  modalEl.getBoundingClientRect();
  modalEl.classList.add('open');
  windowX = 0;
  windowY = 0;
  if (container) {
    container.style.transform = '';
    container.removeAttribute('data-x');
    container.removeAttribute('data-y');
    container.style.width = '';
    container.style.height = '';
  }
  bringModalToFront(modalId);
}

function hideModal() {
  if (!isOpen || isAnimating) return;
  const modalEl = modalContainer;
  if (!modalEl) return;
  isAnimating = true;
  modalEl.classList.remove('open');
  modalEl.classList.add('closing');
  setTimeout(() => {
    modalEl.style.display = 'none';
    modalEl.classList.remove('closing');
    isOpen = false;
    isAnimating = false;
  }, 300);
}

function toggleModal() {
  if (isOpen) {
    hideModal();
  } else {
    showModal();
  }
}

export function initEmojiPickerButton() {
  const button = document.getElementById('emojiPickerBtn');
  if (!button) return;
  
  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleModal();
  });
}