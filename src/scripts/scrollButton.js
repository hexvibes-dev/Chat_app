(function() {
  const btn = document.getElementById('scrollToBottomBtn');
  const messagesEl = document.getElementById('messages');
  const input = document.getElementById('input');
  if (!btn || !messagesEl) return;

  let ticking = false;

  function updateButtonVisibility() {
    const isAtBottom = messagesEl.scrollHeight - messagesEl.clientHeight - messagesEl.scrollTop <= 100;
    btn.style.display = !isAtBottom ? 'flex' : 'none';
    window.isAtBottom = isAtBottom;
  }

  function updateButtonPosition() {
    const layerInput = document.getElementById('layerInput');
    if (!layerInput) return;
    const rect = layerInput.getBoundingClientRect();
    const topPosition = rect.top - 60;
    if (topPosition > 0) {
      btn.style.bottom = 'auto';
      btn.style.top = `${topPosition}px`;
    } else {
      btn.style.top = 'auto';
      btn.style.bottom = '60px';
    }
  }

  function refresh() {
    updateButtonVisibility();
    updateButtonPosition();
    ticking = false;
  }

  function requestRefresh() {
    if (!ticking) {
      requestAnimationFrame(refresh);
      ticking = true;
    }
  }

  messagesEl.addEventListener('scroll', updateButtonVisibility);
  window.addEventListener('resize', requestRefresh);
  window.addEventListener('scroll', requestRefresh);
  window.addEventListener('keyboardchange', requestRefresh);
  window.addEventListener('update-floating-elements', requestRefresh);
  
  // Observar cambios en el DOM que puedan afectar la posición del input
  const observer = new MutationObserver(requestRefresh);
  observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] });
  
  // Observar cambios de tamaño del layerInput
  const layerInput = document.getElementById('layerInput');
  if (layerInput) {
    const resizeObserver = new ResizeObserver(requestRefresh);
    resizeObserver.observe(layerInput);
  }

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();  
  });
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const wasFocused = document.activeElement === input;
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    if (wasFocused && input) {
      input.focus({ preventScroll: true });
    }
  });

  // Actualización inicial y periódica por si acaso
  requestRefresh();
  setInterval(requestRefresh, 500);
})();