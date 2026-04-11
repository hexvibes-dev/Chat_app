if (typeof window.isAtBottom === 'undefined') window.isAtBottom = true;
if (typeof window.smoothScrollToBottom !== 'function') window.smoothScrollToBottom = () => {};

export let keyboardOpen = false;
window.keyboardOpen = keyboardOpen;

export function updateKeyboard() {
  const vv = window.visualViewport;
  if (!vv) {
    document.documentElement.style.setProperty('--keyboard', '0px');
    if (window.keyboardOpen) {
      window.keyboardOpen = false;
      document.documentElement.classList.remove('keyboard-open');
      document.body.classList.remove('keyboard-open');
    }
    return;
  }
  const viewportHeight = vv.height + (vv.offsetTop || 0);
  const keyboard = Math.max(0, window.innerHeight - viewportHeight);
  const isOpen = keyboard > 80;

  document.documentElement.style.setProperty('--keyboard', keyboard + 'px');

  if (isOpen && !window.keyboardOpen) {
    window.keyboardOpen = true;
    document.documentElement.classList.add('keyboard-open');
    document.body.classList.add('keyboard-open');
  } else if (!isOpen && window.keyboardOpen) {
    window.keyboardOpen = false;
    document.documentElement.classList.remove('keyboard-open');
    document.body.classList.remove('keyboard-open');
  }

  const messages = document.getElementById('messages');
  if (isOpen && window.isAtBottom && messages) {
    setTimeout(() => {
      if (typeof window.smoothScrollToBottom === 'function') {
        window.smoothScrollToBottom();
      }
    }, 80);
  }

  try {
    const ev = new CustomEvent('keyboardchange', { detail: { keyboard, isOpen } });
    window.dispatchEvent(ev);
  } catch (err) {}
}
