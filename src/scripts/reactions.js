// src/scripts/reactions.js
import { showOptionsMenu, hideOptionsMenu } from './options.js';
import { computeLayout } from './position.js';
import { showAddReactionModal } from './addReaction.js';
import { showEditModal } from './editModal.js';
import {
  heartRainAnimation,
  fireAnimation,
  dancingEmojiAnimation,
  astonishedAnimation,
  cryAnimation,
  thumbsUpAnimation
} from './reactionAnimations.js';
import { getUsername } from './user.js';
import { emitSocketEvent, isSocketConnected } from './socketUtils.js';
import { enqueueEvent } from './queue.js';
import { loadCustomEmojis } from './emojiUtils.js';
import { showQuickStickerUpload } from './StickerModal.js';
import { isStickerSaved, getStickerCategoryByUrl, removeCustomSticker, refreshStickersInPicker } from './StickerManager.js';
import { shouldReplaceReactionEmoji, reactionEmojiMap, initReactionEmojiAnimations } from './reactionEmojiReplacement.js';

const DEFAULT_EMOJIS = ['👍','❤️','😂','😮','😭','🔥'];
const MAX_REACTIONS_PER_BUBBLE = 4;
const NOTIF_DURATION = 1000;

const messagesEl = document.getElementById('messages');
let activePopup = null;
let activeMenu = null;
let activeThoughtBubbles = [];
let notifEl = null;
let notifTimeout = null;

function showConfirmPopup(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-blur-overlay';
    overlay.style.zIndex = '30001';
    document.body.appendChild(overlay);
    overlay.classList.add('visible');

    const popup = document.createElement('div');
    popup.className = 'confirm-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--modal-bg);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 30002;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 250px;
      text-align: center;
      border: 1px solid var(--modal-input-border);
    `;
    popup.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: var(--modal-text);">${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px;">
        <button class="confirm-no" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #ef4444;">✗</button>
        <button class="confirm-yes" style="background: transparent; border: none; cursor: pointer; font-size: 28px; color: #10b981;">✓</button>
      </div>
    `;
    document.body.appendChild(popup);

    const cleanup = () => {
      popup.remove();
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    };

    popup.querySelector('.confirm-no').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    popup.querySelector('.confirm-yes').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

function showTransientNotification(text, duration = NOTIF_DURATION) {
  if (!notifEl) {
    notifEl = document.createElement('div');
    notifEl.className = 'transient-notif';
    document.body.appendChild(notifEl);
  }
  notifEl.textContent = text;
  notifEl.classList.add('visible');
  if (notifTimeout) clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    notifEl.classList.remove('visible');
  }, duration);
}

function applyLiftEffect(messageEl) {
  removeLiftEffect();
  messageEl.style.transition = 'filter 0.18s ease';
  messageEl.style.filter = 'brightness(1.2)';
  messageEl.dataset._lifted = 'true';
}

function removeLiftEffect() {
  const liftedMsg = document.querySelector('.message[data-_lifted="true"]');
  if (liftedMsg) {
    liftedMsg.style.filter = '';
    liftedMsg.style.transition = '';
    delete liftedMsg.dataset._lifted;
  }
}

function getLocalReactions(msgId) {
  const stored = localStorage.getItem(`reactions_${msgId}`);
  return stored ? JSON.parse(stored) : [];
}

function setLocalReactions(msgId, reactions) {
  localStorage.setItem(`reactions_${msgId}`, JSON.stringify(reactions));
}

function getCustomReactions(messageEl) {
  const custom = messageEl.dataset.customReactions;
  return custom ? JSON.parse(custom) : [];
}

function setCustomReactions(messageEl, reactions) {
  messageEl.dataset.customReactions = JSON.stringify(reactions);
}

function addCustomReaction(messageEl, emoji) {
  const custom = getCustomReactions(messageEl);
  if (!custom.includes(emoji)) {
    custom.push(emoji);
    setCustomReactions(messageEl, custom);
  }
}

function getCustomEmojiUrl(shortcode) {
  if (!window._customEmojiData) return null;
  const cleanShortcode = shortcode.replace(/^:/, '').replace(/:$/, '');
  const found = window._customEmojiData.find(e => e.shortcodes.includes(cleanShortcode));
  return found ? found.url : null;
}

function escapeAttr(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

export function renderReactionsOnBubble(messageEl) {
  const dragWrap = messageEl.querySelector('.msg-drag');
  if (!dragWrap) return;

  let wrap = dragWrap.querySelector('.reactions-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'reactions-wrap';
    dragWrap.appendChild(wrap);
  }

  const reactions = JSON.parse(messageEl.dataset.reactions || '[]');
  const currentBadges = Array.from(wrap.children);
  const newReactionsMap = new Map();

  reactions.slice(0, MAX_REACTIONS_PER_BUBBLE).forEach(r => {
    newReactionsMap.set(r.emoji, r);
  });

  for (let i = currentBadges.length - 1; i >= 0; i--) {
    const badge = currentBadges[i];
    const emoji = badge.getAttribute('data-emoji');
    if (!newReactionsMap.has(emoji)) {
      badge.remove();
    }
  }

  reactions.slice(0, MAX_REACTIONS_PER_BUBBLE).forEach(r => {
    let existingBadge = wrap.querySelector(`.reaction-badge[data-emoji="${escapeAttr(r.emoji)}"]`);
    if (existingBadge) {
      if (r.you) existingBadge.classList.add('you');
      else existingBadge.classList.remove('you');
      const bubble = dragWrap;
      const bg = getComputedStyle(bubble).backgroundColor || '#fff';
      existingBadge.style.borderColor = bg;
      if (r.you) existingBadge.style.backgroundColor = bg;
    } else {
      const btn = document.createElement('button');
      btn.className = 'reaction-badge';
      btn.setAttribute('data-emoji', r.emoji);

      const isCustom = (r.emoji && r.emoji.includes(':') && r.emoji.includes('custom_')) ||
                       (r.emoji && r.emoji.startsWith(':') && r.emoji.endsWith(':'));

      if (isCustom) {
        const url = getCustomEmojiUrl(r.emoji);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = r.emoji;
          img.style.width = '1.2em';
          img.style.height = '1.2em';
          img.style.verticalAlign = 'middle';
          btn.appendChild(img);
        } else {
          btn.innerText = r.emoji;
        }
      } else if (shouldReplaceReactionEmoji(r.emoji)) {
        const config = reactionEmojiMap[r.emoji];
        const img = document.createElement('img');
        img.src = config.url;
        img.alt = r.emoji;
        img.style.width = '32px';
        img.style.height = '32px';
        img.style.objectFit = 'contain';
        img.style.display = 'inline-block';
        img.className = 'reaction-replaced-emoji';
        img.setAttribute('data-animated', config.type === 'webp' ? 'gif' : config.type);
        img.setAttribute('data-duration', config.duration);
        img.setAttribute('data-original-emoji', r.emoji);
        btn.appendChild(img);
        initReactionEmojiAnimations(btn);
      } else {
        btn.innerText = r.emoji;
      }

      if (r.you) btn.classList.add('you');
      const bubble = dragWrap;
      const bg = getComputedStyle(bubble).backgroundColor || '#fff';
      btn.style.borderColor = bg;
      if (r.you) btn.style.backgroundColor = bg;

      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleReactionOnMessage(messageEl, r.emoji);
      });

      wrap.appendChild(btn);
    }
  });
}

export function toggleReactionOnMessage(messageEl, emoji) {
  const msgId = messageEl.dataset.msgId;
  if (!msgId) return;

  let reactions = getLocalReactions(msgId);
  const idx = reactions.findIndex(r => r.emoji === emoji);
  const wasAdded = idx === -1;

  if (wasAdded && reactions.length >= MAX_REACTIONS_PER_BUBBLE) {
    showTransientNotification('Máximo de reacciones alcanzado');
    return;
  }

  if (wasAdded) {
    reactions.push({ emoji, count: 1, you: true });
  } else {
    reactions[idx].count = Math.max(0, reactions[idx].count - 1);
    if (reactions[idx].count === 0) reactions.splice(idx, 1);
  }
  setLocalReactions(msgId, reactions);
  messageEl.dataset.reactions = JSON.stringify(reactions);
  renderReactionsOnBubble(messageEl);

  if (isSocketConnected()) {
    const eventName = wasAdded ? 'reaction:add' : 'reaction:remove';
    emitSocketEvent(eventName, { msgId, emoji });
  } else {
    enqueueEvent(wasAdded ? 'reaction:add' : 'reaction:remove', { msgId, emoji });
  }
}

function extractMessageTextForCopy(messageEl) {
  const dragWrap = messageEl.querySelector('.msg-drag');
  if (!dragWrap) return '';
  const clone = dragWrap.cloneNode(true);
  const quote = clone.querySelector('.reply-quote');
  if (quote) quote.remove();
  const hour = clone.querySelector('.msg-hour');
  if (hour) hour.remove();
  const reactionsWrap = clone.querySelector('.reactions-wrap');
  if (reactionsWrap) reactionsWrap.remove();
  let textEl = clone.querySelector('.message-text');
  let txt = textEl ? textEl.textContent.trim() : '';
  txt = txt.replace(/\s*\(editado\)/g, '');
  return txt;
}

function backupAndDeleteMessage(messageEl, isForAll = false) {
  if (isForAll) {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'transient-notif visible';
    confirmDiv.style.pointerEvents = 'auto';
    confirmDiv.innerHTML = '¿Eliminar para todos? <button class="notif-btn" style="pointer-events:auto;">✓</button> <button class="notif-btn" style="pointer-events:auto;">✗</button>';
    document.body.appendChild(confirmDiv);
    const buttons = confirmDiv.querySelectorAll('.notif-btn');
    buttons[0].onclick = (e) => {
      e.stopPropagation();
      const msgId = messageEl.dataset.msgId;
      confirmDiv.remove();
      if (!isSocketConnected()) {
        showTransientNotification('Sin conexión', 1000);
        return;
      }
      emitSocketEvent('message:delete', { msgId });
      showTransientNotification('Eliminando...', 800);
    };
    buttons[1].onclick = (e) => {
      e.stopPropagation();
      showTransientNotification('Cancelado', 1000);
      confirmDiv.remove();
    };
    setTimeout(() => confirmDiv.remove(), 5000);
  } else {
    const parent = messageEl.parentNode;
    const nextSibling = messageEl.nextSibling;
    const clone = messageEl.cloneNode(true);
    window._deletedMessageBackup = clone;
    window._deletedMessageNextSibling = nextSibling;
    window._deletedMessageParent = parent;
    messageEl.remove();
    showTransientNotification('Mensaje eliminado', 3000);
    const undoDiv = document.createElement('div');
    undoDiv.className = 'transient-notif visible';
    undoDiv.style.pointerEvents = 'auto';
    undoDiv.innerHTML = 'Mensaje eliminado <button class="notif-btn" style="pointer-events:auto;">Deshacer</button>';
    document.body.appendChild(undoDiv);
    const undoBtn = undoDiv.querySelector('.notif-btn');
    undoBtn.onclick = (e) => {
      e.stopPropagation();
      if (window._deletedMessageBackup) {
        const spacer = document.getElementById('spacer');
        if (window._deletedMessageNextSibling && window._deletedMessageNextSibling.parentNode === window._deletedMessageParent) {
          window._deletedMessageParent.insertBefore(window._deletedMessageBackup, window._deletedMessageNextSibling);
        } else {
          window._deletedMessageParent.insertBefore(window._deletedMessageBackup, spacer);
        }
        window._deletedMessageBackup = null;
        window._deletedMessageNextSibling = null;
        window._deletedMessageParent = null;
        showTransientNotification('Mensaje restaurado', 1500);
      }
      undoDiv.remove();
    };
    setTimeout(() => undoDiv.remove(), 5000);
  }
}

async function handleOptionAction(action, messageEl) {
  if (!messageEl) return;
  switch (action) {
    case 'copy':
      const text = extractMessageTextForCopy(messageEl);
      navigator.clipboard?.writeText(text).then(() => {
        showTransientNotification('Mensaje copiado');
      }).catch(() => showTransientNotification('No se pudo copiar'));
      break;
    case 'delete':
      backupAndDeleteMessage(messageEl, false);
      break;
    case 'deleteForAll':
      backupAndDeleteMessage(messageEl, true);
      break;
    case 'edit':
      showEditModal(messageEl, (newText) => {
        const msgId = messageEl.dataset.msgId;
        if (!isSocketConnected()) {
          showTransientNotification('Sin conexión', 1000);
          return;
        }
        emitSocketEvent('message:edit', { msgId, newText });
        showTransientNotification('Editando...', 800);
      });
      break;
    case 'forward':
      showTransientNotification('Mensaje reenviado');
      break;
    case 'addSticker':
      showQuickStickerUpload();
      break;
    case 'deleteSticker': {
      const dragWrap = messageEl.querySelector('.msg-drag');
      const stickerUrl = dragWrap ? dragWrap.dataset.stickerUrl : null;
      if (stickerUrl) {
        const confirmed = await showConfirmPopup('¿Eliminar este sticker de tus guardados?');
        if (confirmed) {
          const category = getStickerCategoryByUrl(stickerUrl);
          if (category) {
            removeCustomSticker(category, stickerUrl);
            showTransientNotification('Sticker eliminado de tus guardados');
            refreshStickersInPicker();
          }
        }
      }
      break;
    }
  }
  hidePopup();
}

function createThoughtBubbles(messageEl, popupEl) {
  activeThoughtBubbles.forEach(b => b.remove());
  activeThoughtBubbles = [];

  const msgRect = messageEl.querySelector('.msg-drag').getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();

  const startX = msgRect.left + msgRect.width / 2;
  const startY = msgRect.top + msgRect.height / 2;
  const endX = popupRect.left + popupRect.width / 2;
  const endY = popupRect.top + popupRect.height / 2;

  const numBubbles = 5;
  const bubbleColors = ['#ffffff', '#f8f9fa', '#e9ecef'];

  for (let i = 1; i <= numBubbles; i++) {
    const t = i / (numBubbles + 0.5);
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;
    const size = 20 + (i / numBubbles) * 30;

    const bubble = document.createElement('div');
    bubble.className = 'thought-bubble';
    bubble.textContent = '';
    bubble.style.position = 'fixed';
    bubble.style.left = (x - size/2) + 'px';
    bubble.style.top = (y - size/2) + 'px';
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.borderRadius = '50%';
    bubble.style.backgroundColor = bubbleColors[i % bubbleColors.length];
    bubble.style.border = '2px solid #333';
    bubble.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.2)';
    bubble.style.zIndex = '500';
    bubble.style.opacity = '0';
    bubble.style.transform = 'scale(0.5)';
    bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    bubble.style.pointerEvents = 'none';
    document.body.appendChild(bubble);
    activeThoughtBubbles.push(bubble);

    setTimeout(() => {
      bubble.style.opacity = '1';
      bubble.style.transform = 'scale(1)';
    }, i * 80);
  }
}

function removeThoughtBubbles() {
  activeThoughtBubbles.forEach(bubble => bubble.remove());
  activeThoughtBubbles = [];
}

function showReactionsPopup(messageEl, anchorRect) {
  hidePopup();

  loadCustomEmojis();

  const popup = document.createElement('div');
  popup.className = 'reactions-popup enter';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'reactions-scroll-container';
  const emojisRow = document.createElement('div');
  emojisRow.className = 'reactions-row';

  const LONG_PRESS_DURATION = 1000;
  const TARGET_SCALE = 3.5;

  DEFAULT_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'react-emoji';
    btn.innerText = emoji;

    let pressTimer = null;
    let longPressCompleted = false;
    let floatingClone = null;
    let scaleInterval = null;

    function createFloatingClone() {
      floatingClone = btn.cloneNode(true);
      floatingClone.classList.add('floating-emoji-clone');
      const rect = btn.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(btn);
      floatingClone.style.position = 'fixed';
      floatingClone.style.left = rect.left + 'px';
      floatingClone.style.top = rect.top + 'px';
      floatingClone.style.width = rect.width + 'px';
      floatingClone.style.height = rect.height + 'px';
      floatingClone.style.fontSize = computedStyle.fontSize;
      floatingClone.style.margin = '0';
      floatingClone.style.zIndex = '100000';
      floatingClone.style.transition = 'none';
      floatingClone.style.pointerEvents = 'none';
      document.body.appendChild(floatingClone);

      let elapsed = 0;
      const stepTime = 20;
      scaleInterval = setInterval(() => {
        elapsed += stepTime;
        const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
        const scale = 1 + (TARGET_SCALE - 1) * progress;
        const newWidth = rect.width * scale;
        const newHeight = rect.height * scale;
        floatingClone.style.transform = `scale(${scale})`;
        floatingClone.style.transformOrigin = 'center center';
        floatingClone.style.left = (rect.left + rect.width/2 - newWidth/2) + 'px';
        floatingClone.style.top = (rect.top + rect.height/2 - newHeight/2) + 'px';
        floatingClone.style.width = newWidth + 'px';
        floatingClone.style.height = newHeight + 'px';
        floatingClone.style.fontSize = parseFloat(computedStyle.fontSize) * scale + 'px';
        if (progress >= 1) clearInterval(scaleInterval);
      }, stepTime);
    }

    function cancelLongPress() {
      if (pressTimer) clearTimeout(pressTimer);
      if (scaleInterval) clearInterval(scaleInterval);
      if (floatingClone) floatingClone.remove();
      floatingClone = null;
      scaleInterval = null;
      longPressCompleted = false;
    }

    function completeLongPress() {
      cancelLongPress();
      longPressCompleted = true;
      switch (emoji) {
        case '❤️': heartRainAnimation(messageEl); break;
        case '🔥': fireAnimation(messageEl); break;
        case '😂': dancingEmojiAnimation(emoji, messageEl); break;
        case '😮': astonishedAnimation(messageEl); break;
        case '😭': cryAnimation(messageEl); break;
        case '👍': thumbsUpAnimation(messageEl); break;
      }
      toggleReactionOnMessage(messageEl, emoji);
      if (navigator.vibrate) navigator.vibrate(100);
      if (isSocketConnected()) {
        emitSocketEvent('reaction:animation', { msgId: messageEl.dataset.msgId, emoji });
      }
    }

    btn.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      cancelLongPress();
      createFloatingClone();
      pressTimer = setTimeout(completeLongPress, LONG_PRESS_DURATION);
    });

    btn.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      if (!longPressCompleted) {
        cancelLongPress();
        toggleReactionOnMessage(messageEl, emoji);
      } else {
        cancelLongPress();
      }
    });

    btn.addEventListener('pointercancel', (ev) => {
      ev.stopPropagation();
      cancelLongPress();
    });

    emojisRow.appendChild(btn);
  });

  const customReactions = getCustomReactions(messageEl);
  
  customReactions.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'react-emoji';
    
    let normalizedShortcode = emoji;
    if (!normalizedShortcode.startsWith(':')) normalizedShortcode = ':' + normalizedShortcode;
    if (!normalizedShortcode.endsWith(':')) normalizedShortcode = normalizedShortcode + ':';
    
    const url = getCustomEmojiUrl(normalizedShortcode);
    
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = emoji;
      img.style.cssText = `
        width: 1.5em !important;
        height: 1.5em !important;
        min-width: 24px !important;
        min-height: 24px !important;
        max-width: 1.5em !important;
        max-height: 1.5em !important;
        vertical-align: middle !important;
        display: inline-block !important;
        border-radius: 4px !important;
        object-fit: contain !important;
      `;
      btn.appendChild(img);
    } else {
      btn.innerText = emoji;
      if (!btn.innerText.trim()) btn.innerText = '?';
    }
    
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleReactionOnMessage(messageEl, emoji);
    });
    emojisRow.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'react-add';
  addBtn.innerText = '➕';
  addBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    showAddReactionModal((newEmoji) => {
      if (!newEmoji) return;
      addCustomReaction(messageEl, newEmoji);
      toggleReactionOnMessage(messageEl, newEmoji);
      hidePopup();
      setTimeout(() => {
        const dragWrap = messageEl.querySelector('.msg-drag');
        if (dragWrap) showReactionsPopup(messageEl, dragWrap.getBoundingClientRect());
      }, 100);
    });
  });
  emojisRow.appendChild(addBtn);

  scrollContainer.appendChild(emojisRow);
  popup.appendChild(scrollContainer);
  document.body.appendChild(popup);

  popup.classList.remove('enter');
  const popupRect = popup.getBoundingClientRect();
  popup.classList.add('enter');

  const isMe = messageEl.classList.contains('me');

  const tempMenu = document.createElement('div');
  tempMenu.className = 'options-menu';
  tempMenu.style.visibility = 'hidden';
  tempMenu.style.position = 'fixed';
  tempMenu.style.top = '-9999px';
  const tempList = document.createElement('div');
  tempList.className = 'options-list';
  const addTempItem = (label) => {
    const btn = document.createElement('button');
    btn.className = 'options-item';
    btn.innerText = label;
    tempList.appendChild(btn);
  };
  addTempItem('Copiar');
  addTempItem('Reenviar');
  addTempItem('Eliminar');
  if (isMe) {
    addTempItem('Eliminar para todos');
    addTempItem('Editar');
  }
  tempMenu.appendChild(tempList);
  document.body.appendChild(tempMenu);
  const menuRect = tempMenu.getBoundingClientRect();
  tempMenu.remove();

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const { popup: popupPos, menu: menuPos, layout } = computeLayout({
    popupRect,
    menuRect,
    viewportW,
    viewportH
  });

  popup.style.left = popupPos.left + 'px';
  popup.style.top = popupPos.top + 'px';
  popup.classList.remove('enter');

  popup.style.transition = 'none';
  popup.style.transform = 'scale(0)';
  popup.style.opacity = '0';

  popup.offsetHeight;

  popup.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1), opacity 0.15s ease';
  popup.style.transform = 'scale(1.3)';
  popup.style.opacity = '1';

  setTimeout(() => {
    popup.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
    popup.style.transform = 'scale(1)';
  }, 200);

  setTimeout(() => {
    popup.style.transition = '';
  }, 400);

  createThoughtBubbles(messageEl, popup);

  showOptionsMenu(messageEl, menuPos, isMe, (action) => {
    handleOptionAction(action, messageEl);
  });

  applyLiftEffect(messageEl);
  activePopup = popup;

  setTimeout(() => {
    window.addEventListener('pointerdown', onOutside);
  }, 0);
}

function onOutside(e) {
  if (!activePopup) return;
  const target = e.target;
  if (!target) return;
  if (target.closest('.reactions-popup') || target.closest('.options-menu')) return;
  hidePopup();
}

function hidePopup() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
  hideOptionsMenu();
  removeLiftEffect();
  removeThoughtBubbles();
  window.removeEventListener('pointerdown', onOutside);
}

if (messagesEl) {
  messagesEl.addEventListener('mousedown', (e) => {
    const bubble = e.target.closest('.msg-drag');
    if (bubble) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  messagesEl.addEventListener('click', (e) => {
    const bubble = e.target.closest('.msg-drag');
    if (!bubble) return;
    const messageEl = bubble.closest('.message');
    
    const gifImg = messageEl.querySelector('.sticker-message img[src$=".gif"], .message-text img[src$=".gif"]');
    if (gifImg) {
      const src = gifImg.src;
      const newSrc = src.includes('?') 
        ? src.replace(/\?t=\d+/, '?t=' + Date.now())
        : src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
      gifImg.src = newSrc;
    }
    
    const rect = bubble.getBoundingClientRect();
    showReactionsPopup(messageEl, rect);
  });
}

function init() {
  Array.from(document.querySelectorAll('.message')).forEach(m => {
    if (m.dataset.reactions) renderReactionsOnBubble(m);
  });
}
init();

export function addReactionRemotely(msgId, emoji, senderId) {
  let msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) {
    const allMessages = document.querySelectorAll('[data-msg-id]');
    for (let m of allMessages) {
      if (m.dataset.msgId.includes(msgId) || msgId.includes(m.dataset.msgId)) {
        msgEl = m;
        break;
      }
    }
    if (!msgEl) return;
  }

  const currentUser = getUsername();
  const isYou = (senderId === currentUser);

  let reactions = JSON.parse(msgEl.dataset.reactions || '[]');
  const idx = reactions.findIndex(r => r.emoji === emoji);
  if (idx === -1) {
    if (reactions.length >= MAX_REACTIONS_PER_BUBBLE) return;
    reactions.push({ emoji, count: 1, you: isYou });
  } else {
    if (isYou) reactions[idx].you = true;
    reactions[idx].count = (reactions[idx].count || 0) + 1;
  }
  msgEl.dataset.reactions = JSON.stringify(reactions);
  renderReactionsOnBubble(msgEl);
  if (isYou) {
    const localReactions = getLocalReactions(msgId);
    const localIdx = localReactions.findIndex(r => r.emoji === emoji);
    if (localIdx === -1) {
      localReactions.push({ emoji, count: 1, you: true });
    } else {
      localReactions[localIdx].count = (localReactions[localIdx].count || 0) + 1;
      localReactions[localIdx].you = true;
    }
    setLocalReactions(msgId, localReactions);
  }
}

export function removeReactionRemotely(msgId, emoji, senderId) {
  let msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) {
    const allMessages = document.querySelectorAll('[data-msg-id]');
    for (let m of allMessages) {
      if (m.dataset.msgId.includes(msgId) || msgId.includes(m.dataset.msgId)) {
        msgEl = m;
        break;
      }
    }
    if (!msgEl) return;
  }

  const currentUser = getUsername();
  const isYou = (senderId === currentUser);

  let reactions = JSON.parse(msgEl.dataset.reactions || '[]');
  const idx = reactions.findIndex(r => r.emoji === emoji);
  if (idx === -1) return;

  if (isYou) reactions[idx].you = false;
  reactions[idx].count = Math.max(0, (reactions[idx].count || 0) - 1);
  if (reactions[idx].count === 0) reactions.splice(idx, 1);
  msgEl.dataset.reactions = JSON.stringify(reactions);
  renderReactionsOnBubble(msgEl);
  if (isYou) {
    const localReactions = getLocalReactions(msgId);
    const localIdx = localReactions.findIndex(r => r.emoji === emoji);
    if (localIdx !== -1) {
      localReactions[localIdx].count = Math.max(0, (localReactions[localIdx].count || 0) - 1);
      if (localReactions[localIdx].count === 0) localReactions.splice(localIdx, 1);
      setLocalReactions(msgId, localReactions);
    }
  }
}

export function playReactionAnimation(msgId, emoji) {
  let msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!msgEl) {
    const allMessages = document.querySelectorAll('[data-msg-id]');
    for (let m of allMessages) {
      if (m.dataset.msgId.includes(msgId) || msgId.includes(m.dataset.msgId)) {
        msgEl = m;
        break;
      }
    }
    if (!msgEl) return;
  }

  switch (emoji) {
    case '❤️': heartRainAnimation(msgEl); break;
    case '🔥': fireAnimation(msgEl); break;
    case '😂': dancingEmojiAnimation(emoji, msgEl); break;
    case '😮': astonishedAnimation(msgEl); break;
    case '😭': cryAnimation(msgEl); break;
    case '👍': thumbsUpAnimation(msgEl); break;
  }
}

export function addReactionToMessageById(msgId, emoji) {
  const m = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (m) toggleReactionOnMessage(m, emoji);
}

export function syncLocalReactionsToServer() {
  if (!isSocketConnected()) return;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('reactions_')) {
      const msgId = key.replace('reactions_', '');
      const localReactions = JSON.parse(localStorage.getItem(key));
      localReactions.forEach(reaction => {
        if (reaction.you) {
          emitSocketEvent('reaction:add', { msgId, emoji: reaction.emoji });
        }
      });
    }
  }
}