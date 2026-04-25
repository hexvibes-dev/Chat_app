// src/scripts/editor/EditorModal.js
import interact from 'interactjs';
import { registerModal, bringModalToFront } from '../modalStackManager.js';
import { EditorManager } from './EditorManager.js';
import { EditorCSSValidator } from './EditorCSSValidator.js';
import { EditorCSSEditor } from './EditorCSSEditor.js';
import { updateFloatingPreviewStyles, updateFloatingPreviewMessage, hideFloatingPreview } from './FloatingPreview.js';
import { appendMessage } from '../messages.js';

let modal = null;
let isOpen = false;
let container = null;
let header = null;
let closeBtn = null;
let windowX = 0, windowY = 0;
let modalId = 'editor-modal';
let currentTab = 'edit';
let animationPreview = null;
let cssEditor = null;

function addResizeHandles(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    element.appendChild(handle);
  });
}

function setupInteract(element, dragHandle) {
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
  interact(element).resizable({
    edges: { top: true, left: true, bottom: true, right: true },
    inertia: false,
    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 100, height: 100 },
        max: { width: window.innerWidth * 0.98, height: window.innerHeight * 0.98 }
      })
    ],
    listeners: {
      move(event) {
        let width = event.rect.width, height = event.rect.height;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        windowX += event.deltaRect.left;
        windowY += event.deltaRect.top;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
      }
    }
  });
  interact(dragHandle).draggable({
    inertia: false,
    manualStart: false,
    allowFrom: dragHandle,
    preventDefault: 'always',
    modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true })],
    listeners: {
      start() { window.isDraggingModal = true; },
      move(event) {
        windowX += event.dx;
        windowY += event.dy;
        element.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
        element.setAttribute('data-x', windowX);
        element.setAttribute('data-y', windowY);
      },
      end() { window.isDraggingModal = false; }
    }
  });
}

function applyAnimationToPreview() {
  if (!animationPreview) return;
  const cssText = EditorManager.getCurrentCSS();
  animationPreview.style.cssText = '';
  const ball = animationPreview.querySelector('.animation-ball');
  if (ball) ball.style.cssText = '';
  
  const keyframesMatch = cssText.match(/@keyframes\s+([\w-]+)\s*\{[^}]*\}/g);
  if (keyframesMatch) {
    let styleTag = document.getElementById('animation-preview-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.className = 'dynamic-keyframes-styles';
      styleTag.id = 'animation-preview-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = keyframesMatch.join('\n');
  }
  
  let processedCss = cssText
    .replace(/anima\s*\{([^}]*)\}/g, '#animation-preview { $1 }')
    .replace(/anima-text\s*\{([^}]*)\}/g, '.animation-ball { $1 }');
  
  const blockRegex = /([\w\-#.]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = blockRegex.exec(processedCss)) !== null) {
    const selector = match[1].trim();
    const decls = match[2].trim();
    const styleObj = {};
    decls.split(';').forEach(decl => {
      const [prop, val] = decl.split(':');
      if (prop && val) {
        const camelProp = prop.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[camelProp] = val.trim();
      }
    });
    if (selector === '#animation-preview') Object.assign(animationPreview.style, styleObj);
    else if (selector === '.animation-ball' && ball) Object.assign(ball.style, styleObj);
  }
}

function emitUpdate() {
  updateFloatingPreviewStyles();
  applyAnimationToPreview();
  window.dispatchEvent(new CustomEvent('editor-styles-updated'));
}

function renderTabs() {
  const tabsContainer = modal.querySelector('.editor-tabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = `
    <button class="editor-tab ${currentTab === 'edit' ? 'active' : ''}" data-tab="edit">Editar</button>
    <button class="editor-tab ${currentTab === 'message' ? 'active' : ''}" data-tab="message">Mensaje</button>
    <button class="editor-tab ${currentTab === 'animation' ? 'active' : ''}" data-tab="animation">Animación</button>
    <button class="editor-tab ${currentTab === 'styles' ? 'active' : ''}" data-tab="styles">Estilos</button>
    <button class="editor-tab ${currentTab === 'custom' ? 'active' : ''}" data-tab="custom">Custom</button>
  `;
  document.querySelectorAll('.editor-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      renderTabs();
      renderTabContent();
    });
  });
}

function renderTabContent() {
  const contentDiv = modal.querySelector('.editor-tab-content');
  if (!contentDiv) return;
  
  switch (currentTab) {
    case 'edit':
      contentDiv.innerHTML = `<div id="editor-css-container" style="height: 100%;"></div><div id="editor-css-errors" class="editor-css-errors"></div>`;
      const cssContainer = document.getElementById('editor-css-container');
      cssEditor = new EditorCSSEditor(cssContainer, (css) => {
        EditorManager.setCurrentCSS(css);
        const errors = EditorCSSValidator.validate(css);
        const errorDiv = document.getElementById('editor-css-errors');
        if (errorDiv) errorDiv.innerHTML = errors.map(err => `<div class="css-error-line">⚠️ ${escapeHtml(err.message)}</div>`).join('');
        emitUpdate();
      }, (errors) => {
        const errorDiv = document.getElementById('editor-css-errors');
        if (errorDiv) errorDiv.innerHTML = errors.map(err => `<div class="css-error-line">⚠️ ${escapeHtml(err.message)}</div>`).join('');
      });
      cssEditor.setValue(EditorManager.getCurrentCSS());
      break;
    case 'message':
      contentDiv.innerHTML = `<textarea id="editor-message-input" class="editor-message-input">${escapeHtml(EditorManager.getMessageText())}</textarea>`;
      document.getElementById('editor-message-input').addEventListener('input', (e) => {
        EditorManager.setMessageText(e.target.value);
        updateFloatingPreviewMessage(e.target.value);
        window.dispatchEvent(new CustomEvent('editor-message-updated', { detail: e.target.value }));
      });
      break;
    case 'animation':
      const animations = EditorManager.getPredefinedAnimations();
      contentDiv.innerHTML = `<div class="editor-animation-list">
        <p style="color: var(--modal-text); margin-bottom: 12px;">Selecciona una animación de ejemplo. Usa <code>anima { ... }</code> y <code>anima-text { ... }</code> en tu CSS.</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
          ${animations.map(anim => `<button class="animation-item" data-animation="${anim.key}">${anim.name}</button>`).join('')}
        </div>
      </div>`;
      document.querySelectorAll('.animation-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const currentCSSValue = EditorManager.getCurrentCSS();
          const newCSS = EditorManager.getAnimationCSS(btn.dataset.animation, currentCSSValue);
          EditorManager.setCurrentCSS(newCSS);
          if (cssEditor) cssEditor.setValue(newCSS);
          emitUpdate();
        });
      });
      break;
    case 'styles':
      const styles = EditorManager.getPredefinedStyles();
      contentDiv.innerHTML = `<div class="editor-styles-list">${styles.map(style => `<button class="style-item" data-style="${style.key}">${style.name}</button>`).join('')}</div>`;
      document.querySelectorAll('.style-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const currentCSSValue = EditorManager.getCurrentCSS();
          const newCSS = EditorManager.getStyleCSS(btn.dataset.style, currentCSSValue);
          EditorManager.setCurrentCSS(newCSS);
          if (cssEditor) cssEditor.setValue(newCSS);
          emitUpdate();
        });
      });
      break;
    case 'custom':
      const savedStyles = EditorManager.getSavedStyles();
      let html = `<div class="editor-custom-container">`;
      if (savedStyles.length > 0) {
        html += `<div class="custom-category-item">
          <div class="category-header" id="custom-styles-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="custom-styles-arrow" class="category-arrow">▼</span>
              <strong>Estilos guardados</strong>
              <span style="font-size: 12px;">(${savedStyles.length})</span>
            </div>
          </div>
          <div id="custom-styles-content" class="category-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
            <div class="editor-custom-list">`;
        savedStyles.forEach((style, idx) => {
          html += `<div class="custom-item">
            <button class="custom-apply" data-style-idx="${idx}">🎨 Aplicar</button>
            <button class="custom-reuse" data-style-idx="${idx}">📋 Reutilizar</button>
            <button class="custom-delete" data-style-idx="${idx}">🗑️ Eliminar</button>
            <span class="custom-name">${escapeHtml(style.name)}</span>
          </div>`;
        });
        html += `</div></div></div>`;
      }
      html += `<button id="save-current-style" class="save-style-btn">💾 Guardar estilo actual</button>
        <button id="reset-tutorial-btn" class="reset-tutorial-btn">🎓 Volver a ver tutorial</button>
      </div>`;
      contentDiv.innerHTML = html;
      
      const customStylesHeader = document.getElementById('custom-styles-header');
      const customStylesContent = document.getElementById('custom-styles-content');
      const customStylesArrow = document.getElementById('custom-styles-arrow');
      if (customStylesHeader && customStylesContent) {
        let isExpanded = false;
        customStylesHeader.addEventListener('click', () => {
          if (isExpanded) {
            customStylesContent.style.maxHeight = '0px';
            customStylesContent.style.paddingTop = '0';
            if (customStylesArrow) customStylesArrow.textContent = '▼';
            isExpanded = false;
          } else {
            customStylesContent.style.maxHeight = customStylesContent.scrollHeight + 'px';
            customStylesContent.style.paddingTop = '12px';
            if (customStylesArrow) customStylesArrow.textContent = '▲';
            isExpanded = true;
          }
        });
      }
      
      document.querySelectorAll('.custom-apply').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.styleIdx);
          const style = savedStyles[idx];
          EditorManager.setCurrentCSS(style.css);
          if (cssEditor) cssEditor.setValue(style.css);
          emitUpdate();
        });
      });
      document.querySelectorAll('.custom-reuse').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.styleIdx);
          const style = savedStyles[idx];
          EditorManager.setCurrentCSS(style.css);
          if (cssEditor) cssEditor.setValue(style.css);
          emitUpdate();
          currentTab = 'edit';
          renderTabs();
          renderTabContent();
        });
      });
      document.querySelectorAll('.custom-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('¿Eliminar este estilo?')) {
            EditorManager.deleteSavedStyle(parseInt(btn.dataset.styleIdx));
            renderTabContent();
          }
        });
      });
      document.getElementById('save-current-style')?.addEventListener('click', () => {
        const name = prompt('Nombre del estilo:');
        if (name) EditorManager.saveCurrentStyle(name);
      });
      document.getElementById('reset-tutorial-btn')?.addEventListener('click', () => {
        localStorage.removeItem('floating_preview_tutorial_seen');
        import('./FloatingPreview.js').then(module => {
          module.hideFloatingPreview();
          module.showFloatingPreview();
        });
      });
      break;
  }
}

function parseCSS(cssText, allowedSelectors) {
  const result = {};
  const blockRegex = /([\w-]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = blockRegex.exec(cssText)) !== null) {
    const selector = match[1].trim();
    if (!allowedSelectors.includes(selector)) continue;
    const decls = match[2].trim();
    const styleObj = {};
    decls.split(';').forEach(decl => {
      const [prop, val] = decl.split(':');
      if (prop && val) {
        let propName = prop.trim();
        let finalVal = val.trim();
        if ((propName === 'background' || propName === 'background-color') && 
            (finalVal === 'black' || finalVal === '#000' || finalVal === '#000000')) {
          finalVal = '#000000';
        }
        const camelProp = propName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[camelProp] = finalVal;
      }
    });
    result[selector] = styleObj;
  }
  return result;
}

function applyStylesToMessage(messageElement, cssText) {
  const dragWrap = messageElement.querySelector('.msg-drag');
  const msgText = messageElement.querySelector('.message-text');
  const hourElement = messageElement.querySelector('.msg-hour');
  if (!dragWrap) return;
  
  dragWrap.style.cssText = '';
  if (msgText) msgText.style.cssText = '';
  if (hourElement) hourElement.style.cssText = '';
  
  const staticStyleMap = parseCSS(cssText, ['bubble', 'text', 'hour']);
  
  if (staticStyleMap['bubble']) {
    for (const [prop, val] of Object.entries(staticStyleMap['bubble'])) {
      let finalVal = val;
      if ((prop === 'background' || prop === 'backgroundColor') && 
          (finalVal === 'black' || finalVal === '#000' || finalVal === '#000000')) {
        finalVal = '#000000';
      }
      if (prop === 'background' || prop === 'backgroundColor') {
        dragWrap.style.setProperty('background-image', 'none', 'important');
        dragWrap.style.setProperty('background', finalVal, 'important');
        dragWrap.style.setProperty('backgroundColor', finalVal, 'important');
      } else {
        dragWrap.style[prop] = finalVal;
      }
    }
  }
  if (msgText && staticStyleMap['text']) {
    for (const [prop, val] of Object.entries(staticStyleMap['text'])) {
      msgText.style[prop] = val;
    }
  }
  if (hourElement && staticStyleMap['hour']) {
    for (const [prop, val] of Object.entries(staticStyleMap['hour'])) {
      hourElement.style[prop] = val;
    }
  }
  
  const animStyleMap = parseCSS(cssText, ['anima', 'anima-text']);
  if (animStyleMap['anima']) {
    for (const [prop, val] of Object.entries(animStyleMap['anima'])) {
      dragWrap.style[prop] = val;
    }
  }
  if (msgText && animStyleMap['anima-text']) {
    for (const [prop, val] of Object.entries(animStyleMap['anima-text'])) {
      msgText.style[prop] = val;
    }
  }
  
  const keyframesMatch = cssText.match(/@keyframes\s+([\w-]+)\s*\{[^}]*\}/g);
  if (keyframesMatch) {
    let styleTag = document.getElementById('sent-message-keyframes');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.className = 'dynamic-keyframes-styles';
      styleTag.id = 'sent-message-keyframes';
      document.head.appendChild(styleTag);
    }
    const existing = styleTag.textContent;
    const newKeyframes = keyframesMatch.filter(kf => !existing.includes(kf.split('{')[0]));
    if (newKeyframes.length) {
      styleTag.textContent = existing + '\n' + newKeyframes.join('\n');
    }
  }
}

function buildModal() {
  if (modal) return;
  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'action-menu-modal';
  modal.innerHTML = `
    <div class="action-menu-container editor-modal-container" style="position: relative;">
      <div class="action-menu-header" id="editor-header">
        <h3>✏️ Customiza tus mensajes</h3>
        <button class="action-menu-close" id="editor-close">&times;</button>
      </div>
      <div class="animation-preview-area">
        <div id="animation-preview">
          <div class="animation-ball"></div>
        </div>
        <div class="animation-label">Vista previa de animación</div>
      </div>
      <div class="editor-tabs"></div>
      <div class="editor-tab-content"></div>
      <div class="editor-bottom-actions">
        <button id="editor-send" class="btn primary">Enviar mensaje</button>
        <button id="editor-save-style" class="btn">Guardar estilo</button>
        <button id="editor-cancel" class="btn-cancel">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  container = modal.querySelector('.action-menu-container');
  header = modal.querySelector('#editor-header');
  closeBtn = modal.querySelector('#editor-close');
  container.style.position = 'relative';
  addResizeHandles(container);
  setupInteract(container, header);
  closeBtn.addEventListener('click', hideModal);
  registerModal(modal, modalId);
  animationPreview = modal.querySelector('#animation-preview');
  renderTabs();
  renderTabContent();
  emitUpdate();
  
  document.getElementById('editor-send').addEventListener('click', () => {
    const messageText = EditorManager.getMessageText();
    const cssText = EditorManager.getCurrentCSS();
    
    appendMessage(messageText, { me: true });
    setTimeout(() => {
      const allMessages = document.querySelectorAll('.message');
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        applyStylesToMessage(lastMessage, cssText);
      }
    }, 10);
    hideModal();
  });
  document.getElementById('editor-save-style').addEventListener('click', () => {
    const name = prompt('Nombre del estilo:');
    if (name) EditorManager.saveCurrentStyle(name);
  });
  document.getElementById('editor-cancel').addEventListener('click', hideModal);
}

function showModal() {
  if (isOpen) return;
  buildModal();
  isOpen = true;
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  modal.getBoundingClientRect();
  modal.classList.add('open');
  windowX = 0; windowY = 0;
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
  if (!isOpen) return;
  isOpen = false;
  hideFloatingPreview();
  modal.classList.remove('open');
  modal.classList.add('closing');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('closing');
  }, 300);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showEditorModal() {
  showModal();
}