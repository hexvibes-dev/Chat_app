// scripts/Theme/initTheme.js
import { initThemeManager } from './themeManager.js';

// Importar updateTerminalPrefixes si está disponible
let updateTerminalPrefixes = () => {};
try {
  // Intenta importar si existe (puede fallar si no está disponible)
  const messagesModule = await import('../Messages/messages.js');
  if (messagesModule.updateTerminalPrefixes) {
    updateTerminalPrefixes = messagesModule.updateTerminalPrefixes;
  }
} catch (e) {
  // Si no está disponible, usar función vacía
  console.warn('updateTerminalPrefixes not available');
}

export function initTheme() {
  const themeManager = initThemeManager({
    onThemeChange: (state) => {
      console.log('Theme changed:', state);
    },
    onTerminalUpdate: () => {
      if (typeof updateTerminalPrefixes === 'function') {
        updateTerminalPrefixes();
      }
    }
  });
  
  return themeManager;
}