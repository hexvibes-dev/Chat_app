let activeObserver = null;
let processedNodes = new WeakSet();

function isEmojiCharacter(text) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*|(\p{Extended_Pictographic})/gu;
  return emojiRegex.test(text);
}

function wrapEmojiTextNode(textNode) {
  const text = textNode.textContent;
  if (!text) return;
  const matches = [...text.matchAll(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*|(\p{Extended_Pictographic})/gu)];
  if (!matches.length) return;

  let lastIndex = 0;
  const fragment = document.createDocumentFragment();
  for (const match of matches) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const span = document.createElement('span');
    span.className = 'emoji';
    span.textContent = match[0];
    span.style.fontFamily = "'Noto Color Emoji', 'Segoe UI Emoji', 'Apple Color Emoji', 'Android Emoji', 'EmojiOne Color', 'Twemoji Mozilla', sans-serif";
    span.style.fontSize = 'inherit';
    span.style.display = 'inline-block';
    fragment.appendChild(span);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  textNode.parentNode.replaceChild(fragment, textNode);
}

function processNode(node) {
  if (!node || processedNodes.has(node)) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (parent && parent.closest('.message')) {
      return;
    }
    if (isEmojiCharacter(node.textContent)) {
      wrapEmojiTextNode(node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.classList?.contains('message')) {
      return; 
    }
    if (node.classList?.contains('emoji') || node.classList?.contains('emoji-item') || node.classList?.contains('category-btn')) {
      return;
    }
    Array.from(node.childNodes).forEach(child => processNode(child));
  }
  processedNodes.add(node);
}

export function polyfillEmojis(container) {
  if (!container) return null;
  processNode(container);

  if (activeObserver) activeObserver.disconnect();

  let timeout = null;
  const debouncedProcess = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      processNode(container);
      timeout = null;
    }, 50);
  };

  const observer = new MutationObserver(mutations => {
    let needsProcess = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length || mutation.type === 'characterData') {
        needsProcess = true;
        break;
      }
    }
    if (needsProcess) debouncedProcess();
  });

  observer.observe(container, { childList: true, subtree: true, characterData: true });
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

export function setSkinTone(tone) {
  localStorage.setItem('emoji_skin_tone', tone);
}
export function getSkinTone() {
  return localStorage.getItem('emoji_skin_tone') || 'default';
}
export function applySkinToneToEmoji(emoji) {
  return emoji;
}