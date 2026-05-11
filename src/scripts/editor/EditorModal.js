import interact from 'interactjs';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../Utils/modalStackManager.js';
import { EditorManager } from './EditorManager.js';
import { EditorCSSValidator } from './EditorCSSValidator.js';
import { EditorCSSEditor } from './EditorCSSEditor.js';
import { updateFloatingPreviewStyles, updateFloatingPreviewMessage, hideFloatingPreview } from './FloatingPreview.js';
import { appendMessage } from '../Messages/messages.js';
import { showGlobalColorPicker } from './GlobalColorPicker.js';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let currentTab = 'edit';
let animationPreview = null;
let cssEditor = null;

function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-editor.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-editor resize-${dir}`;
      element.appendChild(handle);
    }
  });
}

function centerModal() {
  if (!windowElement) return;
  windowElement.offsetHeight;
  const rect = windowElement.getBoundingClientRect();
  const modalWidth = rect.width;
  const modalHeight = rect.height;
  windowX = (window.innerWidth - modalWidth) / 2;
  windowY = (window.innerHeight - modalHeight) / 2;
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
  if (!windowElement || !headerElement) return;

  interact(windowElement).resizable({
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
  const tabsContainer = windowElement.querySelector('.editor-tabs');
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

function renderToolbar() {
  const existingToolbar = windowElement.querySelector('.editor-toolbar');
  if (existingToolbar) existingToolbar.remove();
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML = `
    <button id="editor-clear" class="toolbar-btn" title="Vaciar editor">
      <svg 
        width="16" 
        height="16" fill="currentColor" 
        viewBox="0 0 16 16">
        <path 
          d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path 
          d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>
    </button>
    <button id="editor-undo" class="toolbar-btn" title="Deshacer">
      <svg 
        width="16" 
        height="16" 
        fill="currentColor"
        viewBox="0 0 16 16">
        <path 
          fill-rule="evenodd" 
          d="M1.146 4.854a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H12.5A2.5 2.5 0 0 1 15 6.5v8a.5.5 0 0 1-1 0v-8A1.5 1.5 0 0 0 12.5 5H2.707l3.147 3.146a.5.5 0 1 1-.708.708z"/>
      </svg></button>
    <button id="editor-redo" class="toolbar-btn" title="Rehacer">
      <svg 
        width="16" 
        height="16" 
        fill="currentColor"
        viewBox="0 0 16 16">
        <path 
          fill-rule="evenodd" 
          d="M14.854 4.854a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 4H3.5A2.5 2.5 0 0 0 1 6.5v8a.5.5 0 0 0 1 0v-8A1.5 1.5 0 0 1 3.5 5h9.793l-3.147 3.146a.5.5 0 0 0 .708.708z"/>
      </svg>
    </button>
    <button id="editor-search" class="toolbar-btn" title="Buscar">
    <svg 
      width="16" 
      height="16" 
      fill="currentColor" 
      viewBox="0 0 16 16">
      <path 
        d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
    </svg>
</button>
    <button id="editor-color" class="toolbar-btn" title="Selector de color">
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="1" 
        stroke-linecap="round" 
        stroke-linejoin="round">
        <path 
          stroke="none" 
          d="M0 0h24v24H0z" 
          fill="none" />
        <path 
          d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" /><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path 
          d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path 
          d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
    </button>
  `;
  const animationArea = windowElement.querySelector('.animation-preview-area');
  if (animationArea) {
    animationArea.insertAdjacentElement('afterend', toolbar);
  } else {
    windowElement.insertBefore(toolbar, windowElement.firstChild);
  }

  document.getElementById('editor-clear')?.addEventListener('click', () => {
    if (cssEditor && cssEditor.view) {
      const doc = cssEditor.view.state.doc;
      cssEditor.view.dispatch({ changes: { from: 0, to: doc.length, insert: '' } });
      EditorManager.setCurrentCSS('');
      emitUpdate();
    }
  });
  document.getElementById('editor-undo')?.addEventListener('click', () => {
    if (cssEditor && cssEditor.view) undo(cssEditor.view);
  });
  document.getElementById('editor-redo')?.addEventListener('click', () => {
    if (cssEditor && cssEditor.view) redo(cssEditor.view);
  });
  document.getElementById('editor-search')?.addEventListener('click', async () => {
    if (cssEditor && cssEditor.view) {
      const { showSearchModal } = await import('./SearchModal.js');
      showSearchModal(cssEditor.view);
    }
  });
  document.getElementById('editor-color')?.addEventListener('click', async () => {
    showGlobalColorPicker((color) => {
      if (cssEditor && cssEditor.view) {
        const cursor = cssEditor.view.state.selection.main.head;
        cssEditor.view.dispatch({
          changes: { from: cursor, to: cursor, insert: color }
        });
      }
    });
  });
}

function renderTabContent() {
  const contentDiv = windowElement.querySelector('.editor-tab-content');
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
      renderToolbar();
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
      contentDiv.innerHTML = `<div class="editor-animation-list"><p style="color: #e0e0e0; margin-bottom: 12px;">Selecciona una animación de ejemplo. Usa <code>anima { ... }</code> y <code>anima-text { ... }</code> en tu CSS.</p><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">${animations.map(anim => `<button class="animation-item" data-animation="${anim.key}">${anim.name}</button>`).join('')}</div></div>`;
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
        html += `<div class="custom-category-item"><div class="category-header" id="custom-styles-header"><div style="display: flex; align-items: center; gap: 8px;"><span id="custom-styles-arrow" class="category-arrow">▼</span><strong>Estilos guardados</strong><span style="font-size: 12px;">(${savedStyles.length})</span></div></div><div id="custom-styles-content" class="category-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;"><div class="editor-custom-list">`;
        savedStyles.forEach((style, idx) => {
          html += `<div class="custom-item"><button class="custom-apply" data-style-idx="${idx}">🎨 Aplicar</button><button class="custom-reuse" data-style-idx="${idx}">📋 Reutilizar</button><button class="custom-delete" data-style-idx="${idx}">🗑️ Eliminar</button><span class="custom-name">${escapeHtml(style.name)}</span></div>`;
        });
        html += `</div></div></div>`;
      }
      html += `<button id="save-current-style" class="save-style-btn">💾 Guardar estilo actual</button><button id="reset-tutorial-btn" class="reset-tutorial-btn">🎓 Volver a ver tutorial</button></div>`;
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

function injectKeyframesGlobally(cssText) {
  const keyframesMatch = cssText.match(/@keyframes\s+([\w-]+)\s*\{[^}]*\}/g);
  if (keyframesMatch) {
    let globalKeyframes = document.getElementById('global-keyframes-styles');
    if (!globalKeyframes) {
      globalKeyframes = document.createElement('style');
      globalKeyframes.id = 'global-keyframes-styles';
      document.head.appendChild(globalKeyframes);
    }
    const existing = globalKeyframes.textContent;
    const newKeyframes = keyframesMatch.filter(kf => !existing.includes(kf.split('{')[0]));
    if (newKeyframes.length) {
      globalKeyframes.textContent = existing + '\n' + newKeyframes.join('\n');
    }
  }
}

function extractInheritableFromBubble(originalCss) {
  const inheritableProps = ['color', 'font-size', 'font-family', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform'];
  const bubbleMatch = originalCss.match(/\b(bubble)\s*\{([^}]*)\}/i);
  if (!bubbleMatch) return '';
  const declarations = bubbleMatch[2];
  const result = [];
  inheritableProps.forEach(prop => {
    const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i');
    const match = regex.exec(declarations);
    if (match) {
      result.push(`${prop}: ${match[1]} !important`);
    }
  });
  return result.length ? `.message[data-msg-id="{msgId}"] .text { ${result.join('; ')} }` : '';
}

function applyStylesToMessage(messageElement, cssText) {
  if (!messageElement) return;
  const msgId = messageElement.dataset.msgId || `msg-${Date.now()}`;
  if (!messageElement.dataset.msgId) messageElement.dataset.msgId = msgId;

  injectKeyframesGlobally(cssText);

  let styleTag = document.getElementById(`message-styles-${msgId}`);
  if (styleTag) styleTag.remove();

  const dragWrap = messageElement.querySelector('.msg-drag');
  const msgText = messageElement.querySelector('.message-text');
  const hourElement = messageElement.querySelector('.msg-hour');

  if (dragWrap) dragWrap.classList.add('bubble', 'anima');
  if (msgText) msgText.classList.add('text', 'anima-text');
  if (hourElement) hourElement.classList.add('hour');

  let processedCss = cssText;
  processedCss = processedCss.replace(/([^;{]+):\s*([^;{]+)(?=\s*[;}]|$)(?![^;]*!important)/g, (match, prop, val) => {
    const lowerProp = prop.trim().toLowerCase();
    if (lowerProp === 'animation' || lowerProp === 'transition' || lowerProp === 'transform' || lowerProp.startsWith('animation-')) {
      return `${prop}: ${val}`;
    }
    return `${prop}: ${val} !important`;
  });

  const inheritanceRule = extractInheritableFromBubble(cssText).replace('{msgId}', msgId);

  const finalCss = processedCss
    .replace(/\b(bubble)\b/g, `.message[data-msg-id="${msgId}"] .$1`)
    .replace(/\b(text)\b/g, `.message[data-msg-id="${msgId}"] .$1`)
    .replace(/\b(hour)\b/g, `.message[data-msg-id="${msgId}"] .$1`)
    .replace(/\b(anima)\b/g, `.message[data-msg-id="${msgId}"] .$1`)
    .replace(/\b(anima-text)\b/g, `.message[data-msg-id="${msgId}"] .$1`);

  styleTag = document.createElement('style');
  styleTag.id = `message-styles-${msgId}`;
  styleTag.textContent = finalCss + (inheritanceRule ? '\n' + inheritanceRule : '');
  document.head.appendChild(styleTag);
}

function showModal() {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('editor-movable-window');
    headerElement = document.getElementById('editor-modal-header');
    closeBtn = document.getElementById('close-editor-modal');
    overlay = document.getElementById('editor-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    addResizeHandlesToModal(windowElement);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'editor-modal');
    animationPreview = windowElement.querySelector('#animation-preview');
    renderTabs();
    renderTabContent();
    emitUpdate();
    const sendBtn = document.getElementById('editor-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const messageText = EditorManager.getMessageText();
        const cssText = EditorManager.getCurrentCSS();
        const newMsg = appendMessage(messageText, { me: true });
        if (newMsg) {
          requestAnimationFrame(() => {
            applyStylesToMessage(newMsg, cssText);
          });
        }
        hideModal();
      });
    }
    const saveStyleBtn = document.getElementById('editor-save-style');
    if (saveStyleBtn) {
      saveStyleBtn.addEventListener('click', () => {
        const name = prompt('Nombre del estilo:');
        if (name) EditorManager.saveCurrentStyle(name);
      });
    }
    const cancelBtn = document.getElementById('editor-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
  }
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('editor-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
  hideFloatingPreview();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showEditorModal() {
  showModal();
}