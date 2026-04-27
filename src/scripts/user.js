// src/scripts/user.js
let username = localStorage.getItem('chat_username');
let displayName = localStorage.getItem('chat_displayName');

export function getUsername() {
  return username;
}

export function getDisplayName() {
  return displayName;
}

function setUsername(newName) {
  username = newName;
  localStorage.setItem('chat_username', newName);
}

function setDisplayName(newName) {
  displayName = newName;
  localStorage.setItem('chat_displayName', newName);
}

export function initUserRegistration() {
  if (username) {
    console.log('Usuario ya registrado:', username);
    return;
  }

  const overlay = document.getElementById('user-register-overlay');
  const modal = document.getElementById('user-register-modal');
  if (!overlay || !modal) return;

  const displayInput = document.getElementById('displayNameInput');
  const usernameInput = document.getElementById('usernameInput');
  const acceptBtn = document.getElementById('nameAccept');
  const errorDiv = document.getElementById('usernameError');

  function validateUsername(value) {
    if (!value) return 'El nombre de usuario es obligatorio';
    if (value.length < 3) return 'Mínimo 3 caracteres';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Solo letras, números y guiones bajos';
    return '';
  }

  function updateButtonState() {
    const user = usernameInput.value.trim();
    const display = displayInput.value.trim();
    const error = validateUsername(user);
    errorDiv.textContent = error;
    acceptBtn.disabled = !user || !display || !!error;
  }

  usernameInput.addEventListener('input', updateButtonState);
  displayInput.addEventListener('input', updateButtonState);

  overlay.style.display = 'block';
  modal.style.display = 'flex';

  overlay.getBoundingClientRect();
  overlay.classList.add('visible');
  modal.classList.add('enter');
  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.classList.remove('enter');

  displayInput.focus();

  let keyboardListener = null;
  function updateModalPosition() {
    if (!modal) return;
    const vv = window.visualViewport;
    if (!vv) {
      modal.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
    const offset = keyboardHeight * 0.6;
    modal.style.transform = `translate(-50%, calc(-50% - ${offset}px))`;
  }

  if (window.visualViewport) {
    keyboardListener = () => updateModalPosition();
    window.visualViewport.addEventListener('resize', keyboardListener);
    window.visualViewport.addEventListener('scroll', keyboardListener);
    window.addEventListener('keyboardchange', keyboardListener);
  }

  function cleanup() {
    if (keyboardListener) {
      window.visualViewport?.removeEventListener('resize', keyboardListener);
      window.visualViewport?.removeEventListener('scroll', keyboardListener);
      window.removeEventListener('keyboardchange', keyboardListener);
    }
    overlay.classList.remove('visible');
    modal.classList.add('leave');
    setTimeout(() => {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }, 200);
  }

  acceptBtn.addEventListener('click', () => {
    const display = displayInput.value.trim();
    const user = usernameInput.value.trim();
    const error = validateUsername(user);
    if (error) {
      errorDiv.textContent = error;
      return;
    }

    setDisplayName(display);
    setUsername(user);
    cleanup();
    console.log('Usuario registrado:', user);
  });

  [displayInput, usernameInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !acceptBtn.disabled) {
        e.preventDefault();
        acceptBtn.click();
      }
    });
  });
}