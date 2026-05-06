let keyboardOpen = false;
window.keyboardOpen = keyboardOpen;

function detectKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const kbHeight = Math.max(0, window.innerHeight - vv.height);
  const isOpen = kbHeight > 80;
  document.documentElement.style.setProperty('--keyboard', kbHeight + 'px');

  if (isOpen !== keyboardOpen) {
    keyboardOpen = isOpen;
    window.keyboardOpen = keyboardOpen;
    if (keyboardOpen) {
      document.documentElement.classList.add('keyboard-open');
      document.body.classList.add('keyboard-open');
    } else {
      document.documentElement.classList.remove('keyboard-open');
      document.body.classList.remove('keyboard-open');
    }
    window.dispatchEvent(new CustomEvent('keyboardchange', { detail: { keyboard: kbHeight, isOpen } }));
  }
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', detectKeyboard);
  window.visualViewport.addEventListener('scroll', detectKeyboard);
  detectKeyboard();
}

if (window.ResizeObserver) {
  new ResizeObserver(detectKeyboard).observe(document.documentElement);
}

export function updateKeyboard() {
  detectKeyboard();
}