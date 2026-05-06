export function updateContactStatus(isOnline, lastSeenTimestamp) {
  const statusDiv = document.getElementById('contactStatus');
  if (!statusDiv) return;

  if (isOnline) {
    statusDiv.textContent = 'Online';
    statusDiv.classList.remove('offline');
    statusDiv.classList.add('online');
  } else {
    if (lastSeenTimestamp) {
      const lastSeenDate = new Date(lastSeenTimestamp);
      const now = new Date();
      const diffMs = now - lastSeenDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let lastSeenText = '';
      if (diffMins < 1) lastSeenText = 'hace un momento';
      else if (diffMins < 60) lastSeenText = `hace ${diffMins} min`;
      else if (diffHours < 24) lastSeenText = `hace ${diffHours} h`;
      else lastSeenText = `hace ${diffDays} d`;

      statusDiv.textContent = `Últ. vez ${lastSeenText}`;
    } else {
      statusDiv.textContent = 'Desconectado';
    }
    statusDiv.classList.remove('online');
    statusDiv.classList.add('offline');
  }
}

export function setContactAvatar(imageUrl) {
  const avatarImg = document.getElementById('contactAvatar');
  if (avatarImg && imageUrl) {
    avatarImg.src = imageUrl;
    localStorage.setItem('contact_avatar', imageUrl);
  }
}

export function loadContactAvatar() {
  const savedAvatar = localStorage.getItem('contact_avatar');
  if (savedAvatar) {
    const avatarImg = document.getElementById('contactAvatar');
    if (avatarImg) avatarImg.src = savedAvatar;
  }
}

export function setContactName(name) {
  const nameEl = document.getElementById('contactName');
  if (nameEl) nameEl.textContent = name;
  localStorage.setItem('contact_name', name);
}

export function loadContactName() {
  const savedName = localStorage.getItem('contact_name');
  if (savedName) {
    const nameEl = document.getElementById('contactName');
    if (nameEl) nameEl.textContent = savedName;
  }
}