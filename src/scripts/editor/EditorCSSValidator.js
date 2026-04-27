// src/scripts/editor/EditorCSSValidator.js
export const EditorCSSValidator = {
  validate(cssText) {
    const errors = [];
    const maxWidth = 500;
    const maxHeight = 300;
    const maxFontSize = 48;
    const blockRegex = /([\w-]+)\s*\{([^}]*)\}/g;
    let match;
    while ((match = blockRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const blockContent = match[2];
      
      const widthMatch = blockContent.match(/width\s*:\s*(\d+)(px|%)/);
      if (widthMatch && parseInt(widthMatch[1]) > maxWidth && widthMatch[2] === 'px') {
        errors.push({ line: this.getLineNumber(cssText, match.index), message: `El ancho no puede superar ${maxWidth}px` });
      }
      const heightMatch = blockContent.match(/height\s*:\s*(\d+)(px|%)/);
      if (heightMatch && parseInt(heightMatch[1]) > maxHeight && heightMatch[2] === 'px') {
        errors.push({ line: this.getLineNumber(cssText, match.index), message: `La altura no puede superar ${maxHeight}px` });
      }
      const fontSizeMatch = blockContent.match(/font-size\s*:\s*(\d+)(px|rem|em)/);
      if (fontSizeMatch && parseInt(fontSizeMatch[1]) > maxFontSize) {
        errors.push({ line: this.getLineNumber(cssText, match.index), message: `El tamaño de fuente no puede superar ${maxFontSize}px` });
      }
      
      const dangerous = ['position', 'fixed', 'absolute', 'z-index', 'display', 'visibility'];
      for (let prop of dangerous) {
        if (blockContent.includes(prop)) {
          errors.push({ line: this.getLineNumber(cssText, match.index), message: `La propiedad '${prop}' no está permitida` });
        }
      }
      
      if (selector === 'bubble' || selector === 'text' || selector === 'hour') {
        const hasAnimation = /animation(\s*:|:)/i.test(blockContent);
        const hasTransition = /transition(\s*:|:)/i.test(blockContent);
        if (hasAnimation || hasTransition) {
          errors.push({ 
            line: this.getLineNumber(cssText, match.index), 
            message: `Las animaciones no se permiten en '${selector}'. Usa 'anima' para animar la burbuja o 'anima-text' para animar el texto.` 
          });
        }
      }
    }
    return errors;
  },
  getLineNumber(text, index) {
    return text.substring(0, index).split('\n').length;
  },
  initHighlighting(textarea) {}
};