// src/scripts/scrollButton.js
(function() {
  const btn = document.getElementById('scrollToBottomBtn');
  const messagesEl = document.getElementById('messages');
  const input = document.getElementById('input');
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

  // Prevenir la pérdida de foco del input al hacer clic en el botón de scroll
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();  // Evita que el botón robe el foco
  });
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const wasFocused = document.activeElement === input;
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    if (wasFocused && input) {
      input.focus({ preventScroll: true });
    }
  });

  updateButtonVisibility();
  updateButtonPosition();
})();