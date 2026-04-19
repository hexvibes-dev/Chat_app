// src/scripts/scrollButton.js
(function() {
  const btn = document.getElementById('scrollToBottomBtn');
  const messagesEl = document.getElementById('messages');
  if (!btn || !messagesEl) return;

  function updateButtonVisibility() {
    const isAtBottom = messagesEl.scrollHeight - messagesEl.clientHeight - messagesEl.scrollTop <= 100;
    btn.style.display = !isAtBottom ? 'flex' : 'none';
    window.isAtBottom = isAtBottom;
  }

  function updateButtonPosition() {
    const keyboardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard')) || 0;
    btn.style.bottom = (keyboardHeight + 70) + 'px';
  }

  messagesEl.addEventListener('scroll', updateButtonVisibility);
  window.addEventListener('resize', () => {
    updateButtonVisibility();
    updateButtonPosition();
  });
  window.addEventListener('keyboardchange', updateButtonPosition);

  new MutationObserver(updateButtonVisibility).observe(messagesEl, { childList: true, subtree: true });
  setInterval(updateButtonVisibility, 500);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.getElementById('input');
    const wasFocused = document.activeElement === input;
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    if (wasFocused) {
      // Mantener el foco sin abrir/cerrar teclado
      input.focus({ preventScroll: true });
    }
  });

  updateButtonVisibility();
  updateButtonPosition();
})();