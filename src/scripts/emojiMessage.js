//src/scripts/emojiMessage.js

const EMOJI_REGEX = /^(\p{Emoji}(\p{Emoji_Modifier}?|\uFE0F\u20E3?)?(\u200D\p{Emoji}(\p{Emoji_Modifier}?|\uFE0F\u20E3?)?)*)(\s+(\p{Emoji}(\p{Emoji_Modifier}?|\uFE0F\u20E3?)?(\u200D\p{Emoji}(\p{Emoji_Modifier}?|\uFE0F\u20E3?)?)*))*$/u;
const SIMPLE_EMOJI_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)(\s+(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F?))*$/u;

const COMMON_EMOJIS = [
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '♥️', '♦️', '♣️', '♠️',
  '⭐', '🌟', '✨', '⚡', '🔥', '💧', '💨', '💩', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏'
];

const HEART_EMOJIS = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '♥️'];

const SPECIAL_EMOJIS = {
  '🔥': 'fire',
  '💧': 'water',
  '💩': 'poop',
  '🎉': 'party',
  '😂': 'laugh',
  '⚡': 'lightning',
  '🌟': 'star',
  '⭐': 'star',
  '💀': 'skull',
  '🎈': 'balloon',
  '🎸': 'guitar',
  '👻': 'ghost',
  '🗣️': 'speech',
  '❤️‍🔥': 'burningHeart',
  '😞': 'sad',
  '🤣': 'rollingLaugh',
  '😭': 'cry',
  '🥹': 'emotional',
  '🥺': 'pleading',
  '😱': 'scream',
  '😒': 'unamused',
  '😨': 'fearful',
  '😮': 'astonished',
  '💋': 'kiss',
  '💔': 'brokenHeart'
};

export function isOnlyEmojis(text) {
  if (!text || text.trim() === '') return false;
  const trimmed = text.trim();
  if (EMOJI_REGEX.test(trimmed) || SIMPLE_EMOJI_REGEX.test(trimmed)) return true;
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    if (COMMON_EMOJIS.includes(token)) continue;
    const emojiOnly = /^(\p{Emoji}|\p{Extended_Pictographic})$/u;
    if (!emojiOnly.test(token)) return false;
  }
  return tokens.length > 0;
}

export function countEmojis(text) {
  if (!text) return 0;
  const matches = text.match(/(\p{Emoji}|\p{Extended_Pictographic})(?:\uFE0F|\u20E3)?(?:\u200D(\p{Emoji}|\p{Extended_Pictographic})(?:\uFE0F|\u20E3)?)*/gu);
  return matches ? matches.length : 0;
}

export function getEmojiClass(count) {
  if (count === 1) return 'emoji-single';
  if (count === 2) return 'emoji-double';
  if (count === 3) return 'emoji-triple';
  if (count === 4) return 'emoji-quad';
  return '';
}

export function applyEmojiStyle(dragWrap, text) {
  if (!isOnlyEmojis(text)) return false;
  const emojiCount = countEmojis(text);
  if (emojiCount >= 5) return false;
  const className = getEmojiClass(emojiCount);
  if (className) {
    dragWrap.classList.add(className);
    const messageEl = dragWrap.closest('.message');
    if (messageEl) messageEl.classList.add('emoji-message');
    return true;
  }
  return false;
}

export function isSingleHeart(text) {
  if (!text || text.trim() === '') return false;
  const trimmed = text.trim();
  
  const totalEmojis = countEmojis(trimmed);
  if (totalEmojis !== 1) return false;
  
  const tokens = trimmed.match(/(\p{Emoji}|\p{Extended_Pictographic})(?:\uFE0F)?/gu) || [];
  if (tokens.length !== 1) return false;
  
  const token = tokens[0].replace(/\uFE0F$/, '');
  return HEART_EMOJIS.includes(token) || HEART_EMOJIS.includes(tokens[0]);
}

export function getSpecialEmojiType(text) {
  if (!text || text.trim() === '') return null;
  const trimmed = text.trim();
  
  const totalEmojis = countEmojis(trimmed);
  if (totalEmojis !== 1) return null;
  
  if (!isOnlyEmojis(trimmed)) return null;
  
  const emoji = trimmed;
  return SPECIAL_EMOJIS[emoji] || null;
}

function createParticle(messageEl, dragWrap, emoji, count = 12, sizeRange = [12, 24], delayMs = 60) {
  const rect = dragWrap.getBoundingClientRect();
  
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.innerHTML = emoji;
      particle.style.fontSize = (Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0]) + 'px';
      
      const randomAngle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 100 + 30;
      const offsetX = Math.cos(randomAngle) * radius;
      const offsetY = Math.sin(randomAngle) * radius;
      
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      
      particle.style.left = startX + offsetX + 'px';
      particle.style.top = startY + offsetY + 'px';
      
      const directionX = (Math.random() - 0.5) * 120;
      const directionY = -Math.random() * 100 - 50;
      const rotation = Math.random() * 360;
      const duration = Math.random() * 1.5 + 1;
      
      particle.style.setProperty('--dx', directionX + 'px');
      particle.style.setProperty('--dy', directionY + 'px');
      particle.style.setProperty('--rot', rotation + 'deg');
      particle.style.animationDuration = duration + 's';
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, duration * 1000);
    }, i * delayMs);
  }
}

function createFireSparks(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '🔥', 10, [10, 18]);
}

function createWaterDroplets(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💧', 12, [8, 16]);
}

function createConfetti(messageEl, dragWrap) {
  const confettiEmojis = ['🎉', '✨', '🎊', '🎈'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.innerHTML = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
      particle.style.fontSize = (Math.random() * 10 + 10) + 'px';
      
      const rect = dragWrap.getBoundingClientRect();
      particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
      particle.style.top = (rect.top + Math.random() * rect.height) + 'px';
      
      const directionX = (Math.random() - 0.5) * 150;
      const directionY = -Math.random() * 120 - 40;
      const rotation = Math.random() * 360;
      const duration = Math.random() * 2 + 1;
      
      particle.style.setProperty('--dx', directionX + 'px');
      particle.style.setProperty('--dy', directionY + 'px');
      particle.style.setProperty('--rot', rotation + 'deg');
      particle.style.animationDuration = duration + 's';
      
      document.body.appendChild(particle);
      
      setTimeout(() => particle.remove(), duration * 1000);
    }, i * 50);
  }
}

function createTears(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💧', 15, [8, 14]);
}

function createLightningSparks(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '⚡', 8, [10, 16]);
}

function createStarParticles(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '✨', 15, [8, 14]);
}

function createMusicNotes(messageEl, dragWrap) {
  const notes = ['♪', '♫', '🎵', '🎶'];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.innerHTML = notes[Math.floor(Math.random() * notes.length)];
      particle.style.fontSize = (Math.random() * 12 + 12) + 'px';
      
      const rect = dragWrap.getBoundingClientRect();
      const randomAngle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 80 + 40;
      const offsetX = Math.cos(randomAngle) * radius;
      const offsetY = Math.sin(randomAngle) * radius;
      
      particle.style.left = (rect.left + rect.width / 2 + offsetX) + 'px';
      particle.style.top = (rect.top + rect.height / 2 + offsetY) + 'px';
      
      const directionX = (Math.random() - 0.5) * 80;
      const directionY = -Math.random() * 80 - 30;
      const duration = Math.random() * 1.5 + 1;
      
      particle.style.setProperty('--dx', directionX + 'px');
      particle.style.setProperty('--dy', directionY + 'px');
      particle.style.animationDuration = duration + 's';
      
      document.body.appendChild(particle);
      
      setTimeout(() => particle.remove(), duration * 1000);
    }, i * 70);
  }
}

function createGhostSpirits(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '👻', 8, [10, 18]);
}

function createSpeechBubbles(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💬', 10, [10, 16]);
}

function createHeartParticles(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '❤️', 15, [10, 20]);
}

function createCrackEffects(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💔', 8, [12, 20]);
}

function createSweatDrops(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💧', 10, [8, 14]);
}

function createKissMarks(messageEl, dragWrap) {
  createParticle(messageEl, dragWrap, '💋', 10, [10, 18]);
}

function createFloatingHeart(messageEl, dragWrap) {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.innerHTML = '❤️';
  
  const rect = dragWrap.getBoundingClientRect();
  const randomAngle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 80 + 40;
  const offsetX = Math.cos(randomAngle) * radius;
  const offsetY = Math.sin(randomAngle) * radius;
  
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  
  heart.style.left = startX + offsetX + 'px';
  heart.style.top = startY + offsetY + 'px';
  
  const directionX = (Math.random() - 0.5) * 100;
  const directionY = -Math.random() * 80 - 40;
  const rotation = Math.random() * 360;
  const duration = Math.random() * 1.5 + 1;
  
  heart.style.setProperty('--dx', directionX + 'px');
  heart.style.setProperty('--dy', directionY + 'px');
  heart.style.setProperty('--rot', rotation + 'deg');
  heart.style.animationDuration = duration + 's';
  
  document.body.appendChild(heart);
  
  setTimeout(() => heart.remove(), duration * 1000);
}

function createFloatingHearts(messageEl, dragWrap, count = 12) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      createFloatingHeart(messageEl, dragWrap);
    }, i * 80);
  }
}

export function applyHeartAnimation(messageEl, dragWrap) {
  dragWrap.classList.add('heart-beat-animation');
  messageEl.classList.add('heart-message');
  createFloatingHearts(messageEl, dragWrap, 15);
  
  setTimeout(() => {
    dragWrap.classList.remove('heart-beat-animation');
    dragWrap.classList.add('heart-residual');
    setTimeout(() => {
      dragWrap.classList.remove('heart-residual');
    }, 1000);
  }, 3000);
}

export function applySpecialEmojiAnimation(messageEl, dragWrap, emojiType) {
  dragWrap.classList.add(`${emojiType}-animation`);
  messageEl.classList.add('special-emoji');
  
  switch (emojiType) {
    case 'fire':
      createFireSparks(messageEl, dragWrap);
      break;
    case 'water':
      createWaterDroplets(messageEl, dragWrap);
      break;
    case 'poop':
      break;
    case 'party':
      createConfetti(messageEl, dragWrap);
      break;
    case 'laugh':
      createTears(messageEl, dragWrap);
      break;
    case 'lightning':
      createLightningSparks(messageEl, dragWrap);
      break;
    case 'star':
      createStarParticles(messageEl, dragWrap);
      break;
    case 'skull':
      break;
    case 'balloon':
      break;
    case 'guitar':
      createMusicNotes(messageEl, dragWrap);
      break;
    case 'ghost':
      createGhostSpirits(messageEl, dragWrap);
      break;
    case 'speech':
      createSpeechBubbles(messageEl, dragWrap);
      break;
    case 'burningHeart':
      createFireSparks(messageEl, dragWrap);
      createHeartParticles(messageEl, dragWrap);
      break;
    case 'sad':
      createSweatDrops(messageEl, dragWrap);
      break;
    case 'rollingLaugh':
      createTears(messageEl, dragWrap);
      break;
    case 'cry':
      createWaterDroplets(messageEl, dragWrap);
      break;
    case 'emotional':
      createHeartParticles(messageEl, dragWrap);
      break;
    case 'pleading':
      createHeartParticles(messageEl, dragWrap);
      break;
    case 'scream':
      createLightningSparks(messageEl, dragWrap);
      break;
    case 'unamused':
      createSweatDrops(messageEl, dragWrap);
      break;
    case 'fearful':
      createSweatDrops(messageEl, dragWrap);
      break;
    case 'astonished':
      createStarParticles(messageEl, dragWrap);
      break;
    case 'kiss':
      createKissMarks(messageEl, dragWrap);
      break;
    case 'brokenHeart':
      createCrackEffects(messageEl, dragWrap);
      break;
  }
  
  setTimeout(() => {
    dragWrap.classList.remove(`${emojiType}-animation`);
    dragWrap.classList.add('special-residual');
    setTimeout(() => {
      dragWrap.classList.remove('special-residual');
    }, 1000);
  }, 3000);
}
