import './Messages/messages.js';
import './Utils/scroll.js';
import './Utils/keyboard.js';
import './Messages/input.js';
import './Messages/hour.js';
import './Messages/answer.js';
import './Utils/scrollButton.js';
import './Messages/reactions.js';
import { initUserRegistration } from './Server/user.js';
import { initHamburgerMenu } from './Modals/hamburgerMenu.js';
import { loadCustomEmojis, refreshCustomEmojis, getCustomEmojiData } from './Emojis/EmojiData.js';
import { updateIsAtBottom } from './Utils/scroll.js';
import { updateKeyboard } from './Utils/keyboard.js';
import { input, insertAtCursor } from './Messages/input.js';
import { enableAnswerGestures } from './Messages/answer.js';
import { loadContactAvatar, loadContactName } from './Messages/contactStatus.js';
import { startAutoReplies } from './Utils/automsj.js';
import { initGlobalSounds } from './Sounds/globalSounds.js';
import { getCategories, getCustomEmojiArray, toggleStaticCategoryDisabled, isStaticCategoryDisabled } from './Emojis/CustomEmojiManager.js';
import { initEmojiPicker } from './Emojis/EmojiPickerCore.js';
import { getStaticEmojiCategories } from './Emojis/StaticEmojiCategories.js';
import { generateDevMessages } from './devModeMessages.js';
import { initEmojiScrollManager } from './Utils/emojiScrollManager.js';

let scrollManagerInitialized = false;

function inicializarApp() {
  if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
  if (typeof window.smoothScrollToBottom === 'undefined') window.smoothScrollToBottom = () => {};
  if (typeof window.ensureLastMessageAboveInput === 'undefined') window.ensureLastMessageAboveInput = () => {};
  
  loadCustomEmojis();
  
  const mobileContainer = document.getElementById('mobile-picker-container');
  if (mobileContainer) {
    const picker = initEmojiPicker(mobileContainer, (emoji) => {
      insertAtCursor(emoji, false);
    });
    window.emojiPicker = picker;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initUserRegistration();
    });
  } else {
    initUserRegistration();
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateKeyboard);
  }

  const messagesEl = document.getElementById('messages');
  if (messagesEl) {
    messagesEl.addEventListener('scroll', updateIsAtBottom);
  }

  if (input) {
    input.addEventListener('focus', () => {
      setTimeout(updateKeyboard, 100);
      if (window.isAtBottom) {
        setTimeout(() => {
          if (typeof window.smoothScrollToBottom === 'function') window.smoothScrollToBottom();
          const kb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
          setTimeout(() => {
            if (typeof window.ensureLastMessageAboveInput === 'function') window.ensureLastMessageAboveInput(kb);
          }, 80);
        }, 120);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!window.keyboardOpen) document.documentElement.style.setProperty('--keyboard', '0px');
      }, 100);
    });
  }

  setTimeout(updateIsAtBottom, 50);

  if (messagesEl) {
    new ResizeObserver(() => updateIsAtBottom()).observe(messagesEl);
  }

  enableAnswerGestures();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHamburgerMenu();
    });
  } else {
    initHamburgerMenu();
  }

  loadContactAvatar();
  loadContactName();

  startAutoReplies();
  
  initGlobalSounds();
  
  generateDevMessages();
  
  if (!scrollManagerInitialized) {
    const messagesContainer = document.getElementById('messages');
    const inputElement = document.getElementById('layerInput');
    if (messagesContainer && inputElement) {
      initEmojiScrollManager(messagesContainer, inputElement);
      scrollManagerInitialized = true;
    }
  }
  
  window.togglePepe = () => {
    toggleStaticCategoryDisabled('Pepe');
    if (window.emojiPicker && window.emojiPicker.refresh) {
      setTimeout(() => {
        window.emojiPicker.refresh();
      }, 100);
    }
  };
  
  window.toggleLogos = () => {
    toggleStaticCategoryDisabled('Logos Estáticos');
    if (window.emojiPicker && window.emojiPicker.refresh) {
      setTimeout(() => {
        window.emojiPicker.refresh();
      }, 100);
    }
  };
  
  window.refreshPicker = () => {
    refreshCustomEmojis();
    if (window.emojiPicker && window.emojiPicker.refresh) {
      window.emojiPicker.refresh();
    }
  };
}

window.inicializarApp = inicializarApp;

export default inicializarApp;