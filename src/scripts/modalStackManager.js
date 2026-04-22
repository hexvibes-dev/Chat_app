let modalStack = [];
let baseZIndex = 11000;
let activeModals = [];

export function registerModal(modalElement, modalId) {
  if (!modalElement) return;
  
  const existingIndex = modalStack.findIndex(m => m.id === modalId);
  if (existingIndex !== -1) {
    modalStack.splice(existingIndex, 1);
  }
  
  modalStack.push({
    id: modalId,
    element: modalElement,
    originalZIndex: modalElement.style.zIndex || baseZIndex
  });
  
  updateModalZIndexes();
  
  const bringToFrontHandler = (e) => {
    if (e.target === modalElement || modalElement.contains(e.target)) {
      bringModalToFront(modalId);
    }
  };
  
  modalElement.addEventListener('mousedown', bringToFrontHandler);
  modalElement.addEventListener('touchstart', bringToFrontHandler);
  
  modalElement._bringToFrontHandler = bringToFrontHandler;
  
  if (!activeModals.includes(modalElement)) {
    activeModals.push(modalElement);
  }
}

export function unregisterModal(modalId) {
  const index = modalStack.findIndex(m => m.id === modalId);
  if (index !== -1) {
    const modal = modalStack[index];
    if (modal.element && modal.element._bringToFrontHandler) {
      modal.element.removeEventListener('mousedown', modal.element._bringToFrontHandler);
      modal.element.removeEventListener('touchstart', modal.element._bringToFrontHandler);
      delete modal.element._bringToFrontHandler;
    }
    const modalIndex = activeModals.indexOf(modal.element);
    if (modalIndex !== -1) activeModals.splice(modalIndex, 1);
    modalStack.splice(index, 1);
  }
  updateModalZIndexes();
}

export function bringModalToFront(modalId) {
  const index = modalStack.findIndex(m => m.id === modalId);
  if (index === -1) return;
  
  const modal = modalStack.splice(index, 1)[0];
  modalStack.push(modal);
  
  updateModalZIndexes();
}

function updateModalZIndexes() {
  const increment = 10;
  
  modalStack.forEach((modal, idx) => {
    const newZIndex = baseZIndex + (idx * increment);
    modal.element.style.zIndex = newZIndex;
    
    const overlay = modal.element._associatedOverlay;
    if (overlay) {
      overlay.style.zIndex = newZIndex - 1;
    }
  });
}

export function associateOverlay(modalElement, overlayElement) {
  if (modalElement) {
    modalElement._associatedOverlay = overlayElement;
  }
}

export function getHighestZIndex() {
  if (modalStack.length === 0) return baseZIndex;
  return baseZIndex + (modalStack.length - 1) * 10;
}

export function getInputTop() {
  const inputElement = document.getElementById('layerInput');
  if (!inputElement) return Infinity;
  const rect = inputElement.getBoundingClientRect();
  return rect.top;
}

export function isLessThan10PercentVisible(element) {
  if (!element) return false;
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

export function constrainModalPosition(modalElement, onCloseCallback) {
  const container = modalElement.querySelector('.action-menu-container') || modalElement;
  if (!container) return false;
  
  const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
  if (keyboardHeight === 0) return false;
  
  const inputTop = getInputTop();
  if (inputTop === Infinity) return false;
  
  const modalRect = container.getBoundingClientRect();
  const maxAllowedBottom = inputTop - 10;
  
  if (modalRect.bottom > maxAllowedBottom) {
    const currentY = parseFloat(container.getAttribute('data-y')) || 0;
    const delta = modalRect.bottom - maxAllowedBottom;
    const newY = currentY - delta;
    
    container.style.transform = `translate3d(${parseFloat(container.getAttribute('data-x')) || 0}px, ${newY}px, 0)`;
    container.setAttribute('data-y', newY);
    return true;
  }
  
  if (isLessThan10PercentVisible(container)) {
    if (onCloseCallback && typeof onCloseCallback === 'function') {
      onCloseCallback();
    }
    return true;
  }
  
  return false;
}

export function constrainAllModals() {
  activeModals.forEach(modal => {
    if (modal && modal._constrainHandler) {
      modal._constrainHandler();
    }
  });
}

window.addEventListener('keyboardchange', () => {
  setTimeout(() => constrainAllModals(), 50);
});
window.addEventListener('resize', () => {
  setTimeout(() => constrainAllModals(), 50);
});