import interact from 'interactjs';
import { registerModal, associateOverlay, bringModalToFront, constrainAllModals } from '../modalStackManager.js';
import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

let windowElement, headerElement, closeBtn, overlay;
let windowX = 0, windowY = 0;
let isModalOpen = false;
let currentView = null;
let currentSearchTerm = '';
let currentMatchIndex = -1;
let matches = [];

const setSearchDeco = StateEffect.define();
const searchDecoField = StateField.define({
  create() { return Decoration.none; },
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setSearchDeco)) deco = e.value;
    }
    return deco.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});

(function ensureSearchHighlightStyle() {
  if (document.getElementById('cm-search-highlight-style')) return;
  const s = document.createElement('style');
  s.id = 'cm-search-highlight-style';
  s.textContent = `
    .cm-search-highlight { background-color: rgba(255,235,59,0.6); border-radius: 3px; }
    #search-counter { min-width: 48px; text-align: center; }
    #search-status { min-height: 18px; text-align: center; }
  `;
  document.head.appendChild(s);
})();

function ensureFieldInstalled(view) {
  try {
    if (!view) return false;
    const has = !!view.state.field(searchDecoField, false);
    if (has) return true;
    view.dispatch({ effects: StateEffect.appendConfig.of([searchDecoField]) });
    return !!view.state.field(searchDecoField, false);
  } catch (e) {
    return false;
  }
}

function findMatches(view, term) {
  if (!term || !view) return [];
  const text = view.state.doc.toString();
  const termLower = term.toLowerCase();
  const indices = [];
  let pos = 0;
  while ((pos = text.toLowerCase().indexOf(termLower, pos)) !== -1) {
    indices.push(pos);
    pos += Math.max(1, term.length);
  }
  return indices;
}

function applyDecoration(view, from, to) {
  const mark = Decoration.mark({ class: 'cm-search-highlight', inclusive: true });
  const deco = Decoration.set([mark.range(from, to)]);
  view.dispatch({ effects: setSearchDeco.of(deco) });
}

function clearDecoration(view) {
  if (!view) return;
  view.dispatch({ effects: setSearchDeco.of(Decoration.none) });
}

function selectMatch(view, index) {
  if (!view || index < 0 || index >= matches.length) return false;
  const from = matches[index];
  const to = from + currentSearchTerm.length;
  view.dispatch({ selection: { anchor: from, head: to } });
  if (!ensureFieldInstalled(view)) {
    setTimeout(() => {
      applyDecoration(view, from, to);
      view.dispatch({ effects: EditorView.scrollIntoView(from, { y: 'center', behavior: 'smooth' }) });
    }, 30);
    return true;
  }
  clearDecoration(view);
  applyDecoration(view, from, to);
  view.dispatch({ effects: EditorView.scrollIntoView(from, { y: 'center', behavior: 'smooth' }) });
  return true;
}

function updateMatchCounter() {
  const counter = document.getElementById('search-counter');
  const statusMsg = document.getElementById('search-status');
  if (!counter) return;
  if (matches.length === 0 && currentSearchTerm !== '') {
    counter.textContent = '0 / 0';
    if (statusMsg) statusMsg.textContent = 'No se encontraron coincidencias';
  } else if (matches.length > 0) {
    counter.textContent = `${currentMatchIndex + 1} / ${matches.length}`;
    if (statusMsg) statusMsg.textContent = '';
  } else {
    counter.textContent = '0 / 0';
    if (statusMsg) statusMsg.textContent = '';
  }
}

function performSearch(direction) {
  if (!currentView || !currentSearchTerm) return;
  matches = findMatches(currentView, currentSearchTerm);
  if (matches.length === 0) {
    currentMatchIndex = -1;
    clearDecoration(currentView);
    updateMatchCounter();
    return;
  }
  if (currentMatchIndex === -1) currentMatchIndex = 0;
  if (direction === 'next') {
    currentMatchIndex = (currentMatchIndex + 1) % matches.length;
  } else if (direction === 'prev') {
    currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
  }
  selectMatch(currentView, currentMatchIndex);
  updateMatchCounter();
  const input = document.getElementById('search-input');
  if (input) input.focus();
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
  if (!windowElement || !headerElement) return;
  if (getComputedStyle(windowElement).position === 'static') {
    windowElement.style.position = 'relative';
  }
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

function renderSearchModal(editorView) {
  const container = document.getElementById('search-inner-content');
  if (!container) return;
  currentView = editorView;
  currentSearchTerm = '';
  currentMatchIndex = -1;
  matches = [];
  clearDecoration(currentView);
  container.innerHTML = `
    <div style="padding: 16px; background: var(--modal-bg); border-radius: 28px;">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="search-input" placeholder="Buscar..." style="width: 100%; padding: 8px 12px; border-radius: 20px; border: 1px solid var(--modal-input-border); background: var(--modal-input-bg); color: var(--modal-text); outline: none;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div id="search-counter" style="font-size: 12px; color: var(--modal-text); min-width: 48px; text-align: center;">0 / 0</div>
          <div style="display: flex; gap: 8px;">
            <button id="search-prev" class="btn" style="padding: 4px 12px; border-radius: 20px;">Anterior</button>
            <button id="search-next" class="btn primary" style="padding: 4px 12px; border-radius: 20px;">Siguiente</button>
          </div>
        </div>
        <div id="search-status" style="font-size: 12px; color: #f87171; text-align: center; min-height: 18px;"></div>
      </div>
    </div>
  `;
  const input = document.getElementById('search-input');
  const prevBtn = document.getElementById('search-prev');
  const nextBtn = document.getElementById('search-next');
  if (input) {
    input.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value;
      currentMatchIndex = -1;
      if (currentSearchTerm === '') {
        matches = [];
        updateMatchCounter();
        clearDecoration(currentView);
        if (currentView) currentView.dispatch({ selection: { anchor: 0, head: 0 } });
        return;
      }
      matches = findMatches(currentView, currentSearchTerm);
      if (matches.length > 0) {
        currentMatchIndex = 0;
        selectMatch(currentView, 0);
      } else {
        if (currentView) currentView.dispatch({ selection: { anchor: 0, head: 0 } });
        clearDecoration(currentView);
      }
      updateMatchCounter();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch('next');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        performSearch('next');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        performSearch('prev');
      }
    });
    input.focus();
  }
  if (prevBtn) prevBtn.addEventListener('click', () => performSearch('prev'));
  if (nextBtn) nextBtn.addEventListener('click', () => performSearch('next'));
}

function showModal(editorView) {
  if (isModalOpen) return;
  if (!windowElement) {
    windowElement = document.getElementById('search-movable-window');
    headerElement = document.getElementById('search-modal-header');
    closeBtn = document.getElementById('close-search-modal');
    overlay = document.getElementById('search-overlay');
    if (!windowElement || !headerElement) return;
    associateOverlay(windowElement, overlay);
    setupInteractForModal();
    if (closeBtn) closeBtn.onclick = () => hideModal();
    registerModal(windowElement, 'search-modal');
  }
  if (editorView && !editorView.state.field(searchDecoField, false)) {
    try {
      editorView.dispatch({ effects: StateEffect.appendConfig.of([searchDecoField]) });
    } catch (e) {}
  }
  renderSearchModal(editorView);
  overlay.classList.add('active');
  windowElement.style.display = 'flex';
  centerModal();
  isModalOpen = true;
  bringModalToFront('search-modal');
}

function hideModal() {
  if (!isModalOpen) return;
  if (windowElement) windowElement.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  isModalOpen = false;
  clearDecoration(currentView);
  if (currentView) currentView.dispatch({ selection: { anchor: 0, head: 0 } });
}

export function showSearchModal(editorView) {
  showModal(editorView);
}