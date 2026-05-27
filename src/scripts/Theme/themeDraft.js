// scripts/Theme/themeDraft.js

export class ThemeDraft {
  constructor(applyCallback, updateUICallback) {
    this.applyCallback = applyCallback;
    this.updateUICallback = updateUICallback;
    
    this.theme = null;
    this.bgMode = null;
    this.customBg = null;
    this.opacity = 1;
    
    this.confirmed = {
      theme: null,
      bgMode: null,
      customBg: null,
      opacity: 1
    };
  }

  initFromConfirmed(confirmed) {
    this.confirmed = { ...confirmed };
    this.theme = confirmed.theme;
    this.bgMode = confirmed.bgMode;
    this.customBg = confirmed.customBg;
    this.opacity = confirmed.opacity;
  }

  setTheme(theme) {
    this.theme = theme;
    this.bgMode = 'theme';
    this.customBg = '';
    this.apply();
  }

  setCustomBackground(url) {
    this.bgMode = 'custom';
    this.customBg = url;
    this.apply();
  }

  setBgMode(mode) {
    this.bgMode = mode;
    if (mode === 'theme') {
      this.customBg = '';
    }
    this.apply();
  }

  setOpacity(opacity) {
    this.opacity = opacity;
    this.apply();
  }

  apply() {
    this.applyCallback({
      theme: this.theme,
      bgMode: this.bgMode,
      customBg: this.customBg,
      opacity: this.opacity
    });
    this.updateUICallback?.();
  }

  restore() {
    this.theme = this.confirmed.theme;
    this.bgMode = this.confirmed.bgMode;
    this.customBg = this.confirmed.customBg;
    this.opacity = this.confirmed.opacity;
    this.apply();
  }

  commit() {
    this.confirmed = {
      theme: this.theme,
      bgMode: this.bgMode,
      customBg: this.customBg,
      opacity: this.opacity
    };
  }

  getSnapshot() {
    return {
      theme: this.theme,
      bgMode: this.bgMode,
      customBg: this.customBg,
      opacity: this.opacity
    };
  }

  restoreFromSnapshot(snapshot) {
    if (!snapshot) return;
    this.theme = snapshot.theme;
    this.bgMode = snapshot.bgMode;
    this.customBg = snapshot.customBg;
    this.opacity = snapshot.opacity;
    this.apply();
  }

  getCurrent() {
    return {
      theme: this.theme ?? this.confirmed.theme,
      bgMode: this.bgMode ?? this.confirmed.bgMode,
      customBg: this.customBg ?? this.confirmed.customBg,
      opacity: this.opacity ?? this.confirmed.opacity
    };
  }
}