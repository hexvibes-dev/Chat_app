// scripts/Theme/themeOpacity.js

export class ThemeOpacity {
  constructor(options = {}) {
    this.onSave = options.onSave;
    this.modal = null;
    this.slider = null;
    this.previewImage = null;
    this.currentPreviewUrl = null;
  }

  createModal() {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'opacity-modal';
    this.modal.className = 'opacity-modal';
    this.modal.style.display = 'none';
    this.modal.innerHTML = `
      <div class="opacity-card">
        <div class="opacity-header">
          <h2>Ajustar opacidad</h2>
          <button class="opacity-close-btn" aria-label="Cerrar">✕</button>
        </div>
        <div class="opacity-preview">
          <img id="opacity-preview-img" src="" alt="Vista previa" />
        </div>
        <div class="opacity-slider-container">
          <input type="range" id="opacity-slider" min="0" max="1" step="0.01" value="1" />
        </div>
        <div class="opacity-actions">
          <button class="btn-cancel" id="opacity-cancel">Cancelar</button>
          <button class="btn-save" id="opacity-save">Aplicar</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.slider = document.getElementById('opacity-slider');
    this.previewImage = document.getElementById('opacity-preview-img');
    this.bindEvents();
  }

  bindEvents() {
    this.modal.querySelector('.opacity-close-btn').onclick = () => this.hide();
    document.getElementById('opacity-cancel').onclick = () => this.hide();
    
    document.getElementById('opacity-save').onclick = () => {
      const newOpacity = parseFloat(this.slider.value);
      this.onSave?.(newOpacity, null);
      this.hide();
    };
    
    this.slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.previewImage.style.opacity = val;
      document.documentElement.style.setProperty('--app-bg-opacity', val.toString());
    });
  }

  show(previewUrl) {
    this.createModal();
    this.currentPreviewUrl = previewUrl;
    
    if (!previewUrl) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      previewUrl = canvas.toDataURL('image/png');
    }
    
    this.previewImage.src = previewUrl;
    const currentOpacity = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-bg-opacity')) || 1;
    this.slider.value = currentOpacity;
    this.previewImage.style.opacity = currentOpacity;
    
    this.modal.style.display = 'flex';
    const card = this.modal.querySelector('.opacity-card');
    card.style.animation = 'bounceIn 0.4s ease-out forwards';
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  destroy() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    this.modal = null;
    this.slider = null;
    this.previewImage = null;
  }
}