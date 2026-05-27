// scripts/Theme/modalDraggable.js

import interact from 'interactjs';
import { registerModal, bringModalToFront, constrainAllModals } from '../Utils/modalStackManager.js';
import { addResizeHandlesToModal } from '../Utils/resizeModals.js';

export class ModalDraggable {
  constructor(options) {
    this.element = options.element;
    this.header = options.header;
    this.overlay = options.overlay;
    this.onClose = options.onClose;
    this.onShow = options.onShow;
    this.onHide = options.onHide;
    
    this.x = 0;
    this.y = 0;
    this.isOpen = false;
    this.id = options.id || `modal-${Date.now()}`;
    
    this.init();
  }

  init() {
    addResizeHandlesToModal(this.element);
    this.setupResize();
    this.setupDrag();
    this.setupResizeObserver();
    this.bindEvents();
  }

  setupResize() {
    if (!this.element) return;
    
    interact(this.element).resizable({
      edges: { top: true, left: true, bottom: true, right: true },
      inertia: false,
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 200, height: 300 },
          max: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
        })
      ],
      listeners: {
        start: (event) => {
          event.stopPropagation();
        },
        move: (event) => {
          this.element.style.width = `${event.rect.width}px`;
          this.element.style.height = `${event.rect.height}px`;
          
          const dx = event.deltaRect.left;
          const dy = event.deltaRect.top;
          
          if (dx !== 0 || dy !== 0) {
            this.x += dx;
            this.y += dy;
            this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
          }
          
          constrainAllModals();
        },
        end: (event) => {
          event.stopPropagation();
        }
      }
    });
  }

  setupDrag() {
    if (!this.header) return;
    
    interact(this.header).draggable({
      inertia: false,
      allowFrom: this.header,
      ignoreFrom: '.resize-action, button, input, label, .bg-preview, .theme-btn',
      preventDefault: 'always',
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true
        })
      ],
      listeners: {
        start: (event) => {
          if (event.target.closest('.resize-action')) {
            event.preventDefault();
            return false;
          }
          if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') {
            event.preventDefault();
            return false;
          }
          window.isDraggingModal = true;
        },
        move: (event) => {
          const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
          
          if (keyboardHeight > 0) {
            const inputElement = document.getElementById('layerInput');
            if (inputElement) {
              const inputRect = inputElement.getBoundingClientRect();
              const modalRect = this.element.getBoundingClientRect();
              if (modalRect.bottom + event.dy > inputRect.top - 10) {
                return;
              }
            }
          }
          
          this.x += event.dx;
          this.y += event.dy;
          this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
          constrainAllModals();
        },
        end: (event) => {
          window.isDraggingModal = false;
          if (this.isLessThan10PercentVisible()) {
            this.hide();
          }
          constrainAllModals();
        }
      }
    });
  }

  isLessThan10PercentVisible() {
    const rect = this.element.getBoundingClientRect();
    const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visibleWidth <= 0 || visibleHeight <= 0) return true;
    
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = rect.width * rect.height;
    return (visibleArea / totalArea) < 0.1;
  }

  setupResizeObserver() {
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.setPosition();
      }
    });
  }

  bindEvents() {
    this.overlay?.addEventListener('click', () => this.hide());
  }

  getPosition() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const modalWidth = parseInt(this.element.style.width) || 600;
    const modalHeight = parseInt(this.element.style.height) || 600;
    
    let x, y;
    
    if (!hamburgerBtn) {
      x = (window.innerWidth - modalWidth) / 2;
      y = 70;
    } else {
      const btnRect = hamburgerBtn.getBoundingClientRect();
      x = btnRect.right - modalWidth;
      y = btnRect.bottom + 10;
      
      if (window.innerWidth <= 768) {
        x = btnRect.left;
      }
    }
    
    x = Math.max(10, Math.min(x, window.innerWidth - modalWidth - 10));
    y = Math.max(10, Math.min(y, window.innerHeight - modalHeight - 10));
    
    return { x, y };
  }

  setPosition() {
    const { x, y } = this.getPosition();
    this.x = x;
    this.y = y;
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }

  show() {
    this.setPosition();
    this.element.style.display = 'block';
    this.overlay?.classList.add('active');
    this.isOpen = true;
    
    registerModal(this.element, this.id);
    bringModalToFront(this.id);
    
    this.onShow?.();
  }

  hide() {
    this.element.style.animation = 'modalCircularBounceOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => {
      this.element.style.display = 'none';
      this.element.style.animation = '';
    }, 250);
    this.overlay?.classList.remove('active');
    this.isOpen = false;
    this.onHide?.();
    this.onClose?.();
  }
}