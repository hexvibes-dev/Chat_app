// src/scripts/emojiReplacement.js
export const emojiReplacementMap = {
  '🫠': { url: '/emojis/512.webp', type: 'webp' },
  '🥺': { url: '/emojis/512-18.webp', type: 'webp' },
  '😭': { url: '/img/emojis/cry.svg', type: 'svg' },
};

export function shouldReplaceEmoji(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return Object.prototype.hasOwnProperty.call(emojiReplacementMap, trimmed);
}

export function replaceEmojisInHtml(html, skipReplacement = false) {
  if (skipReplacement) return html;
  if (!html) return html;
  let result = html;
  for (const [emoji, config] of Object.entries(emojiReplacementMap)) {
    const regex = new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, `<img src="${config.url}" class="replaced-emoji" data-animated="${config.type === 'webp' ? 'gif' : config.type}" data-original-emoji="${emoji}" alt="${emoji}">`);
  }
  return result;
}

export function normalizeReplacedEmojisToText(html) {
  if (!html) return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('img.replaced-emoji').forEach(img => {
    const originalEmoji = img.getAttribute('alt');
    if (originalEmoji) {
      const textNode = document.createTextNode(originalEmoji);
      img.parentNode.replaceChild(textNode, img);
    }
  });
  return div.innerHTML;
}

function loadImagePromise(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) resolve();
    else { img.onload = () => resolve(); img.onerror = () => resolve(); }
  });
}

async function playAnimationOnce(img) {
  const animated = img.getAttribute('data-animated');
  if (animated === 'gif') {
    const src = img.src;
    img.src = '';
    img.src = src;
  } else if (animated === 'svg') {
    if (img.contentDocument) {
      img.contentDocument.querySelectorAll('animate, animateTransform, animateMotion, set').forEach(el => el.beginElement());
    } else {
      img.src = img.src;
    }
  }
}

async function freezeGif(img) {
  if (img.dataset.state === 'frozen') return;
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, rect.width, rect.height);
  canvas.className = img.className;
  canvas.setAttribute('data-original-emoji', img.getAttribute('data-original-emoji'));
  canvas.setAttribute('alt', img.alt);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  canvas.style.objectFit = img.style.objectFit || 'contain';
  canvas.dataset.state = 'frozen';
  img.parentNode.replaceChild(canvas, img);
}

async function animateOnceAndFreeze(img) {
  if (!img || img.tagName !== 'IMG') return;
  if (img.dataset.state === 'playing' || img.dataset.state === 'frozen') return;
  img.dataset.state = 'loading';
  await loadImagePromise(img);
  if (!img.parentNode) return;
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    img.style.width = '1.5em';
    img.style.height = '1.5em';
  }
  img.dataset.state = 'playing';
  await playAnimationOnce(img);
  setTimeout(() => {
    if (img.parentNode && img.dataset.state === 'playing') freezeGif(img);
  }, 3000);
}

function handleReplacedEmojiClick(e) {
  const target = e.target;
  if (!target.classList?.contains('replaced-emoji')) return;
  e.stopPropagation();
  if (target.tagName === 'CANVAS' && target.dataset.state === 'frozen') {
    const originalEmoji = target.getAttribute('data-original-emoji');
    if (originalEmoji && emojiReplacementMap[originalEmoji]) {
      const config = emojiReplacementMap[originalEmoji];
      const newImg = document.createElement('img');
      newImg.src = config.url;
      newImg.className = target.className;
      newImg.setAttribute('data-animated', config.type === 'webp' ? 'gif' : config.type);
      newImg.setAttribute('data-original-emoji', originalEmoji);
      newImg.alt = originalEmoji;
      const rect = target.getBoundingClientRect();
      newImg.style.width = rect.width + 'px';
      newImg.style.height = rect.height + 'px';
      target.parentNode.replaceChild(newImg, target);
      animateOnceAndFreeze(newImg);
    }
  }
}

document.addEventListener('click', handleReplacedEmojiClick);

export function initReplacedEmojiAnimations(container) {
  const imgs = container ? container.querySelectorAll('.replaced-emoji') : document.querySelectorAll('.replaced-emoji');
  imgs.forEach(img => {
    if (img.tagName === 'IMG' && !img.dataset.state) {
      const rect = img.getBoundingClientRect();
      if (rect.width && rect.height) {
        img.style.width = rect.width + 'px';
        img.style.height = rect.height + 'px';
      }
      animateOnceAndFreeze(img);
    }
  });
}