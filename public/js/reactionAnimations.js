export function heartRainAnimation(messageEl) {
  const rect = messageEl.getBoundingClientRect();
  const heartColors = ['❤️', '🧡', '💛', '💚', '💙', '💜', '💗', '💕', '💘', '💓'];
  const heartCount = 80;

  for (let i = 0; i < heartCount; i++) {
    setTimeout(() => {
      const heart = document.createElement('div');
      heart.className = 'heart-rain-particle';
      heart.innerHTML = heartColors[Math.floor(Math.random() * heartColors.length)];
      heart.style.fontSize = (Math.random() * 20 + 15) + 'px';
      heart.style.left = (rect.left + Math.random() * rect.width) + 'px';
      heart.style.top = (rect.top + Math.random() * rect.height) + 'px';
      
      const dx = (Math.random() - 0.5) * 150;
      const dy = -Math.random() * 200 - 50;
      const rot = Math.random() * 360;
      const duration = Math.random() * 2 + 1.5;
      
      heart.style.setProperty('--dx', dx + 'px');
      heart.style.setProperty('--dy', dy + 'px');
      heart.style.setProperty('--rot', rot + 'deg');
      heart.style.animationDuration = duration + 's';
      
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), duration * 1000);
    }, i * 40);
  }
}

export function fireAnimation(messageEl) {
  const rect = messageEl.getBoundingClientRect();
  const particles = [];
  const totalParticles = 70;
  
  for (let i = 0; i < totalParticles; i++) {
    const isFire = Math.random() > 0.3;
    particles.push({
      emoji: isFire ? '🔥' : '💥',
      size: isFire ? 20 + Math.random() * 25 : 15 + Math.random() * 20,
      delay: i * 30,
      duration: 1.5 + Math.random() * 2,
      dx: (Math.random() - 0.5) * 180,
      dy: -Math.random() * 200 - 60,
      rot: Math.random() * 360,
      startX: rect.left + Math.random() * rect.width,
      startY: rect.top + Math.random() * rect.height
    });
  }

  for (let p of particles) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'fire-particle-simple';
      el.innerHTML = p.emoji;
      el.style.fontSize = p.size + 'px';
      el.style.left = p.startX + 'px';
      el.style.top = p.startY + 'px';
      el.style.setProperty('--dx', p.dx + 'px');
      el.style.setProperty('--dy', p.dy + 'px');
      el.style.setProperty('--rot', p.rot + 'deg');
      el.style.animation = `fireFloat ${p.duration}s ease-out forwards`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), p.duration * 1000);
    }, p.delay);
  }
}

export function dancingEmojiAnimation(emoji, messageEl) {
  const rect = messageEl.getBoundingClientRect();
  const dancer = document.createElement('div');
  dancer.className = 'dancing-emoji';
  dancer.innerHTML = emoji;
  dancer.style.left = (rect.left + rect.width / 2 - 50) + 'px';
  dancer.style.top = (rect.top + rect.height / 2 - 50) + 'px';
  dancer.style.fontSize = '100px';
  document.body.appendChild(dancer);
  
  setTimeout(() => dancer.remove(), 2000);
  
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const tear = document.createElement('div');
      tear.className = 'tear-particle';
      tear.innerHTML = '💧';
      tear.style.fontSize = (Math.random() * 10 + 8) + 'px';
      tear.style.left = (rect.left + Math.random() * rect.width) + 'px';
      tear.style.top = (rect.top + Math.random() * rect.height) + 'px';
      const dx = (Math.random() - 0.5) * 100;
      const dy = Math.random() * 80 + 20;
      tear.style.setProperty('--dx', dx + 'px');
      tear.style.setProperty('--dy', dy + 'px');
      tear.style.animation = 'floatUp 1.5s ease-out forwards';
      document.body.appendChild(tear);
      setTimeout(() => tear.remove(), 1500);
    }, i * 80);
  }
}

export function astonishedAnimation(messageEl) {
  const rect = messageEl.getBoundingClientRect();
  const exclamations = ['❗', '❓', '‼️', '⁉️', '❗', '❕'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const ex = document.createElement('div');
      ex.className = 'astonished-particle';
      ex.innerHTML = exclamations[Math.floor(Math.random() * exclamations.length)];
      ex.style.fontSize = (Math.random() * 20 + 10) + 'px';
      ex.style.left = (rect.left + Math.random() * rect.width) + 'px';
      ex.style.top = (rect.top + Math.random() * rect.height) + 'px';
      const dx = (Math.random() - 0.5) * 120;
      const dy = -Math.random() * 150 - 30;
      ex.style.setProperty('--dx', dx + 'px');
      ex.style.setProperty('--dy', dy + 'px');
      ex.style.animation = 'floatUp 1.5s ease-out forwards';
      document.body.appendChild(ex);
      setTimeout(() => ex.remove(), 1500);
    }, i * 50);
  }
  
  const glow = document.createElement('div');
  glow.className = 'glow-effect';
  glow.style.left = (rect.left + rect.width/2 - 60) + 'px';
  glow.style.top = (rect.top + rect.height/2 - 60) + 'px';
  glow.style.width = '120px';
  glow.style.height = '120px';
  document.body.appendChild(glow);
  setTimeout(() => glow.remove(), 1000);
}

export function cryAnimation(messageEl) {
  const dragWrap = messageEl.querySelector('.msg-drag');
  if (!dragWrap) return;
  const rect = dragWrap.getBoundingClientRect();

  dragWrap.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  dragWrap.style.transformOrigin = 'top center';
  dragWrap.style.transform = 'scaleY(0.85) scaleX(1.02)';
  setTimeout(() => {
    dragWrap.style.transform = '';
    setTimeout(() => {
      dragWrap.style.transition = '';
    }, 300);
  }, 800);

  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const tear = document.createElement('div');
      tear.className = 'tear-particle';
      tear.innerHTML = '💧';
      tear.style.fontSize = (Math.random() * 16 + 8) + 'px';
      const startX = rect.left + Math.random() * rect.width;
      const startY = rect.top + Math.random() * rect.height * 0.8;
      tear.style.left = startX + 'px';
      tear.style.top = startY + 'px';
      const dx = (Math.random() - 0.5) * 120;
      const dy = Math.random() * 200 + 80;
      tear.style.setProperty('--dx', dx + 'px');
      tear.style.setProperty('--dy', dy + 'px');
      tear.style.animation = 'tearFall 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
      document.body.appendChild(tear);
      setTimeout(() => tear.remove(), 1200);
    }, i * 30);
  }
}

export function thumbsUpAnimation(messageEl) {
  const rect = messageEl.getBoundingClientRect();
  const thumbs = document.createElement('div');
  thumbs.className = 'thumbs-up-particle';
  thumbs.innerHTML = '👍';
  thumbs.style.fontSize = '60px';
  thumbs.style.left = (rect.left + rect.width/2 - 30) + 'px';
  thumbs.style.top = (rect.top + rect.height/2 - 30) + 'px';
  document.body.appendChild(thumbs);
  
  thumbs.style.animation = 'thumbsUp 1s ease-out forwards';
  setTimeout(() => thumbs.remove(), 1000);
  
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const star = document.createElement('div');
      star.className = 'star-particle';
      star.innerHTML = '⭐';
      star.style.fontSize = (Math.random() * 10 + 5) + 'px';
      star.style.left = (rect.left + Math.random() * rect.width) + 'px';
      star.style.top = (rect.top + Math.random() * rect.height) + 'px';
      const dx = (Math.random() - 0.5) * 100;
      const dy = -Math.random() * 100 - 20;
      star.style.setProperty('--dx', dx + 'px');
      star.style.setProperty('--dy', dy + 'px');
      star.style.animation = 'floatUp 1s ease-out forwards';
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 1000);
    }, i * 50);
  }
}
