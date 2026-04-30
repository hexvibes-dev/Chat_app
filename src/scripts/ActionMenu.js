import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from './modalStackManager.js';
import { showCustomEmojiModal, showQuickEmojiUpload } from './CustomEmojiModal.js';
import { showCustomStickerModal, showQuickStickerUpload } from './StickerModal.js';
import { insertAtCursor } from './input.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-action resize-${dir}`;
    element.appendChild(handle);
  });
}

function centerModal() {
  if (!windowElement) return;
  const rect = windowElement.getBoundingClientRect();
  windowX = (window.innerWidth - rect.width) / 2;
  windowY = (window.innerHeight - rect.height) / 2;
  windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
  windowElement.setAttribute('data-x', windowX);
  windowElement.setAttribute('data-y', windowY);
}

function isLessThan10PercentVisible(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
  if (visibleWidth <= 0 || visibleHeight <= 0) return true;
  const visibleArea = visibleWidth * visibleHeight;
  const totalArea = rect.width * rect.height;
  return (visibleArea / totalArea) < 0.1;
}

function setupInteractForModal() {
  interact(windowElement).resizable({
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
        windowElement.style.width = `${width}px`;
        windowElement.style.height = `${height}px`;
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      }
    }
  });

  interact(headerElement).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: headerElement,
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
        const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
        if (keyboardHeight > 0) {
          const inputElement = document.getElementById('layerInput');
          if (inputElement) {
            const inputRect = inputElement.getBoundingClientRect();
            const modalRect = windowElement.getBoundingClientRect();
            const inputTop = inputRect.top;
            const modalBottom = modalRect.bottom;
            if (modalBottom + event.dy > inputTop - 10) return;
          }
        }
        windowX += event.dx;
        windowY += event.dy;
        windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        windowElement.setAttribute('data-x', windowX);
        windowElement.setAttribute('data-y', windowY);
        constrainAllModals();
      },
      end() {
        window.isDraggingModal = false;
        if (isLessThan10PercentVisible(windowElement)) {
          hideModal();
        }
        constrainAllModals();
      }
    }
  });
}

function handleAction(action) {
  switch (action) {
    case 'sticker':
      showQuickStickerUpload();
      break;
    case 'emoji':
      showQuickEmojiUpload();
      break;
    case 'image':
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const imgHtml = `<img src="${ev.target.result}" style="max-width:100%;max-height:150px;border-radius:8px;">`;
            insertAtCursor(imgHtml, window.keyboardOpen);
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
      break;
    case 'manage_emoji':
      showCustomEmojiModal();
      break;
    case 'manage_sticker':
      showCustomStickerModal();
      break;
    case 'editor':
      import('./editor/FloatingPreview.js').then(m => m.showFloatingPreview());
      import('./editor/EditorModal.js').then(m => m.showEditorModal());
      break;
  }
}

function showModal() {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('action-movable-window');
    headerElement = document.getElementById('action-modal-header');
    closeBtn = document.getElementById('close-action-modal');
    overlay = document.getElementById('action-menu-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) {
      closeBtn.onclick = () => hideModal();
    }
    windowElement.querySelectorAll('.action-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        const action = opt.dataset.action;
        handleAction(action);
        hideModal();
      });
    });
    registerModal(windowElement, 'action-menu-modal');
  }
  overlay.classList.add('active');
  windowElement.style.display = 'block';
  centerModal();
  isModalOpen = true;
  bringModalToFront('action-menu-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
}

export function initActionMenu() {
  const button = document.getElementById('actionMenuBtn');
  if (!button) return;
  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (isModalOpen) hideModal();
    else showModal();
  });
}