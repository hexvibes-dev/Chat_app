// src/scripts/reactionEmojiReplacement.js
export const reactionEmojiMap = {
  '🥺': {
    url: '/emojis/reaction-512-18.webp',
    type: 'webp',
    duration: 2000
  },
  '😭': {
    url: '/img/emojis/reaction-cry.svg',
    type: 'svg',
    duration: 2000
  },
  '🫠': {
    url: '/emojis/512.webp',
    type: 'webp',
    duration: 2000
  }
};

export function shouldReplaceReactionEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return false;
  return Object.prototype.hasOwnProperty.call(reactionEmojiMap, emoji.trim());
}

function loadImagePromise(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }
  });
}

function playAnimationOnce(img) {
  if (!img) return;
  const animated = img.getAttribute('data-animated');
  if (animated === 'gif') {
    const src = img.src;
    img.src = '';
    img.src = src;
  } else if (animated === 'svg') {
    const svgDoc = img.contentDocument;
    if (svgDoc) {
      const animElements = svgDoc.querySelectorAll('animate, animateTransform, animateMotion, set');
      animElements.forEach(el => el.beginElement());
    } else {
      img.src = img.src;
    }
  }
}

async function freezeGif(img) {
  if (!img || img.dataset.state === 'frozen') return;
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
    img.style.width = '32px';
    img.style.height = '32px';
  }
  img.dataset.state = 'playing';
  playAnimationOnce(img);
  let duration = parseInt(img.getAttribute('data-duration')) || 2000;
  setTimeout(async () => {
    if (img.parentNode) {
      await freezeGif(img);
    }
  }, duration);
}

function handleReactionEmojiClick(e) {
  const target = e.target;
  if (!target.classList || !target.classList.contains('reaction-replaced-emoji')) return;
  e.stopPropagation();
  if (target.tagName === 'CANVAS' && target.dataset.state === 'frozen') {
    const originalEmoji = target.getAttribute('data-original-emoji');
    if (originalEmoji && reactionEmojiMap[originalEmoji]) {
      const config = reactionEmojiMap[originalEmoji];
      const newImg = document.createElement('img');
      newImg.src = config.url;
      newImg.className = target.className;
      newImg.setAttribute('data-animated', config.type === 'webp' ? 'gif' : config.type);
      newImg.setAttribute('data-duration', config.duration);
      newImg.setAttribute('data-original-emoji', originalEmoji);
      newImg.alt = originalEmoji;
      const rect = target.getBoundingClientRect();
      newImg.style.width = rect.width + 'px';
      newImg.style.height = rect.height + 'px';
      newImg.style.objectFit = target.style.objectFit || 'contain';
      target.parentNode.replaceChild(newImg, target);
      animateOnceAndFreeze(newImg);
    }
  }
}

document.addEventListener('click', handleReactionEmojiClick);

export function initReactionEmojiAnimations(container) {
  if (!container) return;
  const imgs = container.querySelectorAll('.reaction-replaced-emoji');
  imgs.forEach(img => {
    if (img.tagName === 'IMG' && !img.dataset.state) {
      const rect = img.getBoundingClientRect();
      if (rect.width && rect.height) {
        img.style.width = rect.width + 'px';
        img.style.height = rect.height + 'px';
        img.style.objectFit = img.style.objectFit || 'contain';
      }
      animateOnceAndFreeze(img);
    }
  });
}