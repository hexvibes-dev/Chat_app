// src/scripts/editor/emojiPolyfill.js

import twemoji from 'twemoji';

let activeObserver = null;
let processedNodes = new WeakSet();

const SKIN_TONE_MODIFIERS = {
  'light': 'рҹҸ»',
  'medium-light': 'рҹҸј',
  'medium': 'рҹҸҪ',
  'medium-dark': 'рҹҸҫ',
  'dark': 'рҹҸҝ'
};

let currentSkinTone = localStorage.getItem('emoji_skin_tone') || 'default';

function getSkinToneChar() {
  if (currentSkinTone === 'default') return '';
  return SKIN_TONE_MODIFIERS[currentSkinTone] || '';
}

export function setSkinTone(tone) {
  currentSkinTone = tone;
  localStorage.setItem('emoji_skin_tone', tone);
}

export function getSkinTone() {
  return currentSkinTone;
}

export function applySkinToneToEmoji(emoji) {
  if (currentSkinTone === 'default') return emoji;
  const toneChar = SKIN_TONE_MODIFIERS[currentSkinTone];
  if (!toneChar) return emoji;
  
  if (/[\u{1F3FB}-\u{1F3FF}]/u.test(emoji)) return emoji;
  
  const skinToneBaseEmojis = [
    'рҹ‘Ӣ', 'рҹӨҡ', 'рҹ–җпёҸ', 'вңӢ', 'рҹ––', 'рҹ‘Ң', 'рҹӨҢ', 'рҹӨҸ', 'вңҢпёҸ', 'рҹӨһ', 'рҹ«°', 'рҹӨҹ', 'рҹӨҳ', 'рҹӨҷ',
    'рҹ‘Ҳ', 'рҹ‘ү', 'рҹ‘Ҷ', 'рҹ–•', 'рҹ‘Ү', 'вҳқпёҸ', 'рҹ‘Қ', 'рҹ‘Һ', 'вңҠ', 'рҹ‘Ҡ', 'рҹӨӣ', 'рҹӨң', 'рҹ‘Ҹ', 'рҹҷҢ',
    'рҹ«¶', 'рҹ‘җ', 'рҹӨІ', 'рҹӨқ', 'рҹҷҸ', 'рҹ’Ә', 'рҹҰө', 'рҹҰ¶', 'рҹ‘Ӯ', 'рҹҰ»', 'рҹ‘ғ', 'рҹ‘¶', 'рҹ§’', 'рҹ‘Ұ',
    'рҹ‘§', 'рҹ§‘', 'рҹ‘©', 'рҹ§”', 'рҹ‘Ё', 'рҹ‘®', 'рҹ•өпёҸ', 'рҹ’Ӯ', 'рҹҘ·', 'рҹ‘·', 'рҹ«…', 'рҹӨҙ', 'рҹ‘ё', 'рҹ‘°',
    'рҹӨө', 'рҹ‘ј', 'рҹҺ…', 'рҹӨ¶', 'рҹҰё', 'рҹҰ№', 'рҹ§ҷ', 'рҹ§ҡ', 'рҹ§ӣ', 'рҹ§ң', 'рҹ§қ', 'рҹ’Ҷ', 'рҹ’Ү', 'рҹҡ¶',
    'рҹ§Қ', 'рҹ§Һ', 'рҹҸғ', 'вӣ№пёҸ', 'рҹҸӢпёҸ', 'рҹҡҙ', 'рҹҡө', 'рҹӨё', 'рҹҸҢпёҸ', 'рҹҸ„', 'рҹҸҠ', 'рҹӨҪ', 'рҹ§ҳ'
  ];
  
  let normalized = emoji.normalize('NFC');
  for (const base of skinToneBaseEmojis) {
    if (normalized === base || normalized.startsWith(base)) {
      return normalized + toneChar;
    }
  }
  return emoji;
}

export function polyfillEmojis(container) {
  if (!container) return null;
  
  const options = {
    base: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/',
    ext: '.svg',
    className: 'twemoji-emoji',
    size: 'svg',
    folder: 'svg'
  };
  
  const parse = (el) => {
    if (!el || processedNodes.has(el)) return;
    
    const textNodes = [];
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (parent && (parent.classList?.contains('twemoji-emoji') || 
              parent.classList?.contains('emoji-item') === false)) {
            return NodeFilter.FILTER_SKIP;
          }
          if (node.textContent && /[\u{1F300}-\u{1FAFF}]/u.test(node.textContent)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    
    textNodes.forEach(textNode => {
      let text = textNode.textContent;
      if (currentSkinTone !== 'default') {
        const skinToneBaseEmojis = [
          'рҹ‘Ӣ', 'рҹӨҡ', 'рҹ–җпёҸ', 'вңӢ', 'рҹ––', 'рҹ‘Ң', 'рҹӨҢ', 'рҹӨҸ', 'вңҢпёҸ', 'рҹӨһ', 'рҹ«°', 'рҹӨҹ', 'рҹӨҳ', 'рҹӨҷ',
          'рҹ‘Ҳ', 'рҹ‘ү', 'рҹ‘Ҷ', 'рҹ–•', 'рҹ‘Ү', 'вҳқпёҸ', 'рҹ‘Қ', 'рҹ‘Һ', 'вңҠ', 'рҹ‘Ҡ', 'рҹӨӣ', 'рҹӨң', 'рҹ‘Ҹ', 'рҹҷҢ',
          'рҹ«¶', 'рҹ‘җ', 'рҹӨІ', 'рҹӨқ', 'рҹҷҸ', 'рҹ’Ә', 'рҹҰө', 'рҹҰ¶', 'рҹ‘Ӯ', 'рҹҰ»', 'рҹ‘ғ', 'рҹ‘¶', 'рҹ§’', 'рҹ‘Ұ',
          'рҹ‘§', 'рҹ§‘', 'рҹ‘©', 'рҹ§”', 'рҹ‘Ё', 'рҹ‘®', 'рҹ•өпёҸ', 'рҹ’Ӯ', 'рҹҘ·', 'рҹ‘·', 'рҹ«…', 'рҹӨҙ', 'рҹ‘ё', 'рҹ‘°',
          'рҹӨө', 'рҹ‘ј', 'рҹҺ…', 'рҹӨ¶', 'рҹҰё', 'рҹҰ№', 'рҹ§ҷ', 'рҹ§ҡ', 'рҹ§ӣ', 'рҹ§ң', 'рҹ§қ', 'рҹ’Ҷ', 'рҹ’Ү', 'рҹҡ¶',
          'рҹ§Қ', 'рҹ§Һ', 'рҹҸғ', 'вӣ№пёҸ', 'рҹҸӢпёҸ', 'рҹҡҙ', 'рҹҡө', 'рҹӨё', 'рҹҸҢпёҸ', 'рҹҸ„', 'рҹҸҠ', 'рҹӨҪ', 'рҹ§ҳ'
        ];
        for (const base of skinToneBaseEmojis) {
          const regex = new RegExp(`(${base})(?![\u{1F3FB}-\u{1F3FF}])`, 'gu');
          text = text.replace(regex, `$1${SKIN_TONE_MODIFIERS[currentSkinTone]}`);
        }
      }
      if (text !== textNode.textContent) {
        const span = document.createElement('span');
        span.className = 'emoji-text-replacement';
        span.textContent = text;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
    
    const targets = el.querySelectorAll('.emoji-item, .category-btn, .emoji-section-title, .emoji-section');
    targets.forEach(node => {
      if (processedNodes.has(node)) return;
      if (!node.classList.contains('twemoji-processed')) {
        node.classList.add('twemoji-processed');
        twemoji.parse(node, options);
        processedNodes.add(node);
      }
    });
    processedNodes.add(el);
  };
  
  const style = () => {
    const twemojis = document.querySelectorAll('.twemoji-emoji');
    twemojis.forEach(img => {
      if (img.style.cssText !== 'width:1.2em;height:1.2em;vertical-align:middle;display:inline-block;object-fit:contain;') {
        img.style.cssText = 'width:1.2em;height:1.2em;vertical-align:middle;display:inline-block;object-fit:contain;';
      }
    });
    document.querySelectorAll('.category-btn .twemoji-emoji').forEach(img => {
      img.style.width = '22px';
      img.style.height = '22px';
    });
    document.querySelectorAll('.emoji-item .twemoji-emoji').forEach(img => {
      img.style.width = '32px';
      img.style.height = '32px';
    });
  };
  
  parse(container);
  style();
  
  if (activeObserver) activeObserver.disconnect();
  
  let parseTimeout = null;
  const throttledParse = () => {
    if (parseTimeout) return;
    parseTimeout = setTimeout(() => {
      parse(container);
      style();
      parseTimeout = null;
    }, 50);
  };
  
  const observer = new MutationObserver((mutations) => {
    let needsParse = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        needsParse = true;
        break;
      }
    }
    if (needsParse) throttledParse();
  });
  
  observer.observe(container, { childList: true, subtree: true });
  activeObserver = observer;
  return observer;
}

export function destroyEmojiPolyfill() {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  processedNodes.clear();
}