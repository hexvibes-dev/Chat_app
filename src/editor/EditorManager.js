// src/scripts/editor/EditorManager.js
const STORAGE_CSS_KEY = 'editor_current_css';
const STORAGE_MSG_KEY = 'editor_current_message';
const STORAGE_SAVED_STYLES = 'editor_saved_styles';

let currentCSS = localStorage.getItem(STORAGE_CSS_KEY) || '';
let currentMessage = localStorage.getItem(STORAGE_MSG_KEY) || '¡Hola! Este es un mensaje de prueba.';
let savedStyles = [];
function agregarOActualizarSelector(css, nuevoSelector, nuevoContenido) {
  const selectorRegex = new RegExp(`(\\b${nuevoSelector}\\b\\s*\\{)([^}]*)(\\})`, 'gi');
  let match = selectorRegex.exec(css);
  
  if (match) {
    const contenidoExistente = match[2].trim();
    let nuevoContenidoFusionado;
    
    if (contenidoExistente) {
      const propiedadesNuevas = nuevoContenido.split(';').filter(p => p.trim());
      let contenidoFinal = contenidoExistente;
      
      for (let prop of propiedadesNuevas) {
        const propName = prop.split(':')[0].trim();
        const propRegex = new RegExp(`\\b${propName}\\s*:`, 'i');
        if (!propRegex.test(contenidoExistente)) {
          contenidoFinal += '\n  ' + prop.trim();
        }
      }
      nuevoContenidoFusionado = contenidoFinal;
    } else {
      nuevoContenidoFusionado = nuevoContenido;
    }
    
    return css.replace(selectorRegex, `$1\n  ${nuevoContenidoFusionado}\n$3`);
  } else {
    const nuevoBloque = `\n\n${nuevoSelector} {\n  ${nuevoContenido}\n}`;
    return css + nuevoBloque;
  }
}

function agregarOActualizarKeyframe(css, nombreKeyframe, nuevoContenido) {
  const keyframeRegex = new RegExp(`(@keyframes\\s+${nombreKeyframe}\\s*\\{)([^}]*)(\\})`, 'gi');
  let match = keyframeRegex.exec(css);
  
  if (match) {
    const contenidoExistente = match[2].trim();
    let nuevoContenidoFusionado;
    
    if (contenidoExistente && contenidoExistente !== nuevoContenido) {
      nuevoContenidoFusionado = nuevoContenido;
    } else {
      nuevoContenidoFusionado = nuevoContenido;
    }
    return css.replace(keyframeRegex, `$1\n  ${nuevoContenidoFusionado}\n$3`);
  } else {
    return css + `\n\n@keyframes ${nombreKeyframe} {\n  ${nuevoContenido}\n}`;
  }
}

export const EditorManager = {
  getCurrentCSS() { return currentCSS; },
  setCurrentCSS(css) { currentCSS = css; localStorage.setItem(STORAGE_CSS_KEY, css); },
  getMessageText() { return currentMessage; },
  setMessageText(msg) { currentMessage = msg; localStorage.setItem(STORAGE_MSG_KEY, msg); },
  
  getPredefinedAnimations() {
    return [
      { key: 'bounce', name: 'Rebote' },
      { key: 'fadeIn', name: 'Desvanecer' },
      { key: 'shake', name: 'Agitar' },
      { key: 'pulse', name: 'Pulso' },
      { key: 'swing', name: 'Columpio' },
      { key: 'wobble', name: 'Temblor' },
      { key: 'flash', name: 'Destello' },
      { key: 'rubberBand', name: 'Goma' },
      { key: 'tada', name: 'Tada' },
      { key: 'jello', name: 'Jello' },
      { key: 'heartBeat', name: 'Latido' },
      { key: 'flip', name: 'Giro' },
      { key: 'rotateIn', name: 'Rotar' },
      { key: 'rollIn', name: 'Rodar' },
      { key: 'slideInDown', name: 'Deslizar abajo' },
      { key: 'slideInUp', name: 'Deslizar arriba' },
      { key: 'zoomIn', name: 'Zoom' },
      { key: 'lightSpeedIn', name: 'Velocidad luz' },
      { key: 'backInDown', name: 'Rebote abajo' },
      { key: 'bounceIn', name: 'Rebote entrada' }
    ];
  },
  
  getAnimationCSS(key, existingCSS = '') {
    const animations = {
      bounce: { keyframe: '0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); }', selector: 'anima', property: 'animation: bounce 0.5s ease infinite;' },
      fadeIn: { keyframe: 'from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); }', selector: 'anima', property: 'animation: fadeIn 0.5s ease;' },
      shake: { keyframe: '0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); }', selector: 'anima', property: 'animation: shake 0.3s ease infinite;' },
      pulse: { keyframe: '0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); }', selector: 'anima', property: 'animation: pulse 0.4s ease infinite;' },
      swing: { keyframe: '20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); }', selector: 'anima', property: 'animation: swing 0.6s ease infinite; transform-origin: top center;' },
      wobble: { keyframe: '0% { transform: translateX(0%); } 15% { transform: translateX(-25%) rotate(-5deg); } 30% { transform: translateX(20%) rotate(3deg); } 45% { transform: translateX(-15%) rotate(-3deg); } 60% { transform: translateX(10%) rotate(2deg); } 75% { transform: translateX(-5%) rotate(-1deg); } 100% { transform: translateX(0%); }', selector: 'anima', property: 'animation: wobble 0.8s ease infinite;' },
      flash: { keyframe: '0%,50%,100% { opacity: 1; } 25%,75% { opacity: 0; }', selector: 'anima', property: 'animation: flash 0.5s ease infinite;' },
      rubberBand: { keyframe: '0% { transform: scale(1); } 30% { transform: scaleX(1.25) scaleY(0.75); } 40% { transform: scaleX(0.75) scaleY(1.25); } 60% { transform: scaleX(1.15) scaleY(0.85); } 100% { transform: scale(1); }', selector: 'anima', property: 'animation: rubberBand 0.6s ease infinite;' },
      tada: { keyframe: '0% { transform: scale(1); } 10%,20% { transform: scale(0.9) rotate(-3deg); } 30%,50%,70%,90% { transform: scale(1.1) rotate(3deg); } 40%,60%,80% { transform: scale(1.1) rotate(-3deg); } 100% { transform: scale(1) rotate(0); }', selector: 'anima', property: 'animation: tada 0.8s ease infinite;' },
      jello: { keyframe: '0%,100% { transform: skewX(0deg); } 30% { transform: skewX(-12.5deg); } 40% { transform: skewX(6.25deg); } 50% { transform: skewX(-3.125deg); } 65% { transform: skewX(1.5625deg); } 75% { transform: skewX(-0.78125deg); }', selector: 'anima', property: 'animation: jello 0.7s ease infinite;' },
      heartBeat: { keyframe: '0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); }', selector: 'anima', property: 'animation: heartBeat 1s ease infinite;' },
      flip: { keyframe: '0% { transform: perspective(400px) rotateY(0deg); } 100% { transform: perspective(400px) rotateY(360deg); }', selector: 'anima', property: 'animation: flip 0.6s ease; backface-visibility: visible;' },
      rotateIn: { keyframe: 'from { transform: rotate(-200deg); opacity: 0; } to { transform: rotate(0); opacity: 1; }', selector: 'anima', property: 'animation: rotateIn 0.5s ease;' },
      rollIn: { keyframe: 'from { transform: translateX(-100%) rotate(-120deg); opacity: 0; } to { transform: translateX(0) rotate(0); opacity: 1; }', selector: 'anima', property: 'animation: rollIn 0.6s ease;' },
      slideInDown: { keyframe: 'from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; }', selector: 'anima', property: 'animation: slideInDown 0.4s ease;' },
      slideInUp: { keyframe: 'from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; }', selector: 'anima', property: 'animation: slideInUp 0.4s ease;' },
      zoomIn: { keyframe: 'from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; }', selector: 'anima', property: 'animation: zoomIn 0.3s ease;' },
      lightSpeedIn: { keyframe: 'from { transform: translateX(100%) skewX(-30deg); opacity: 0; } 60% { transform: translateX(-20%) skewX(30deg); opacity: 1; } 80% { transform: translateX(0%) skewX(-15deg); opacity: 1; } to { transform: translateX(0%) skewX(0deg); opacity: 1; }', selector: 'anima', property: 'animation: lightSpeedIn 0.5s ease;' },
      backInDown: { keyframe: '0% { transform: translateY(-1200px) scale(0.7); opacity: 0.7; } 80% { transform: translateY(0px) scale(0.7); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; }', selector: 'anima', property: 'animation: backInDown 0.5s ease;' },
      bounceIn: { keyframe: '0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; }', selector: 'anima', property: 'animation: bounceIn 0.5s ease;' }
    };
    
    const anim = animations[key];
    if (!anim) return '';
    
    let resultado = existingCSS || currentCSS;
    
    resultado = agregarOActualizarKeyframe(resultado, key, anim.keyframe);
    resultado = agregarOActualizarSelector(resultado, 'anima', anim.property);
    
    return resultado;
  },
  
  getPredefinedStyles() {
    return [
      { key: 'gradient', name: 'Gradiente' },
      { key: 'shadow', name: 'Sombra' },
      { key: 'rounded', name: 'Bordes redondeados' }
    ];
  },
  
  getStyleCSS(key, existingCSS = '') {
    const styles = {
      gradient: { selector: 'bubble', property: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;' },
      shadow: { selector: 'bubble', property: 'box-shadow: 0 10px 20px rgba(0,0,0,0.2);' },
      rounded: { selector: 'bubble', property: 'border-radius: 30px;' }
    };
    
    const style = styles[key];
    if (!style) return existingCSS || currentCSS;
    
    let resultado = existingCSS || currentCSS;
    resultado = agregarOActualizarSelector(resultado, style.selector, style.property);
    
    return resultado;
  },
  
  getSavedStyles() {
    const stored = localStorage.getItem(STORAGE_SAVED_STYLES);
    if (stored) savedStyles = JSON.parse(stored);
    return savedStyles;
  },
  
  saveCurrentStyle(name) {
    savedStyles.push({ name, css: currentCSS });
    localStorage.setItem(STORAGE_SAVED_STYLES, JSON.stringify(savedStyles));
  },
  
  deleteSavedStyle(index) {
    savedStyles.splice(index, 1);
    localStorage.setItem(STORAGE_SAVED_STYLES, JSON.stringify(savedStyles));
  }
};