
let currentTone = localStorage.getItem('manual_skin_tone') || 'default';

const SKIN_TONE_MAP = {
  // Manos y dedos
  '👋': { light: '👋🏻', mediumLight: '👋🏼', medium: '👋🏽', mediumDark: '👋🏾', dark: '👋🏿' },
  '🤚': { light: '🤚🏻', mediumLight: '🤚🏼', medium: '🤚🏽', mediumDark: '🤚🏾', dark: '🤚🏿' },
  '🖐️': { light: '🖐🏻', mediumLight: '🖐🏼', medium: '🖐🏽', mediumDark: '🖐🏾', dark: '🖐🏿' },
  '✋': { light: '✋🏻', mediumLight: '✋🏼', medium: '✋🏽', mediumDark: '✋🏾', dark: '✋🏿' },
  '🖖': { light: '🖖🏻', mediumLight: '🖖🏼', medium: '🖖🏽', mediumDark: '🖖🏾', dark: '🖖🏿' },
  '👌': { light: '👌🏻', mediumLight: '👌🏼', medium: '👌🏽', mediumDark: '👌🏾', dark: '👌🏿' },
  '🤌': { light: '🤌🏻', mediumLight: '🤌🏼', medium: '🤌🏽', mediumDark: '🤌🏾', dark: '🤌🏿' },
  '🤏': { light: '🤏🏻', mediumLight: '🤏🏼', medium: '🤏🏽', mediumDark: '🤏🏾', dark: '🤏🏿' },
  '✌️': { light: '✌🏻', mediumLight: '✌🏼', medium: '✌🏽', mediumDark: '✌🏾', dark: '✌🏿' },
  '🤞': { light: '🤞🏻', mediumLight: '🤞🏼', medium: '🤞🏽', mediumDark: '🤞🏾', dark: '🤞🏿' },
  '🤟': { light: '🤟🏻', mediumLight: '🤟🏼', medium: '🤟🏽', mediumDark: '🤟🏾', dark: '🤟🏿' },
  '🤘': { light: '🤘🏻', mediumLight: '🤘🏼', medium: '🤘🏽', mediumDark: '🤘🏾', dark: '🤘🏿' },
  '🤙': { light: '🤙🏻', mediumLight: '🤙🏼', medium: '🤙🏽', mediumDark: '🤙🏾', dark: '🤙🏿' },
  '👈': { light: '👈🏻', mediumLight: '👈🏼', medium: '👈🏽', mediumDark: '👈🏾', dark: '👈🏿' },
  '👉': { light: '👉🏻', mediumLight: '👉🏼', medium: '👉🏽', mediumDark: '👉🏾', dark: '👉🏿' },
  '👆': { light: '👆🏻', mediumLight: '👆🏼', medium: '👆🏽', mediumDark: '👆🏾', dark: '👆🏿' },
  '🖕': { light: '🖕🏻', mediumLight: '🖕🏼', medium: '🖕🏽', mediumDark: '🖕🏾', dark: '🖕🏿' },
  '👇': { light: '👇🏻', mediumLight: '👇🏼', medium: '👇🏽', mediumDark: '👇🏾', dark: '👇🏿' },
  '☝️': { light: '☝🏻', mediumLight: '☝🏼', medium: '☝🏽', mediumDark: '☝🏾', dark: '☝🏿' },
  '👍': { light: '👍🏻', mediumLight: '👍🏼', medium: '👍🏽', mediumDark: '👍🏾', dark: '👍🏿' },
  '👎': { light: '👎🏻', mediumLight: '👎🏼', medium: '👎🏽', mediumDark: '👎🏾', dark: '👎🏿' },
  '✊': { light: '✊🏻', mediumLight: '✊🏼', medium: '✊🏽', mediumDark: '✊🏾', dark: '✊🏿' },
  '👊': { light: '👊🏻', mediumLight: '👊🏼', medium: '👊🏽', mediumDark: '👊🏾', dark: '👊🏿' },
  '🤛': { light: '🤛🏻', mediumLight: '🤛🏼', medium: '🤛🏽', mediumDark: '🤛🏾', dark: '🤛🏿' },
  '🤜': { light: '🤜🏻', mediumLight: '🤜🏼', medium: '🤜🏽', mediumDark: '🤜🏾', dark: '🤜🏿' },
  '👏': { light: '👏🏻', mediumLight: '👏🏼', medium: '👏🏽', mediumDark: '👏🏾', dark: '👏🏿' },
  '🙌': { light: '🙌🏻', mediumLight: '🙌🏼', medium: '🙌🏽', mediumDark: '🙌🏾', dark: '🙌🏿' },
  '👐': { light: '👐🏻', mediumLight: '👐🏼', medium: '👐🏽', mediumDark: '👐🏾', dark: '👐🏿' },
  '🤲': { light: '🤲🏻', mediumLight: '🤲🏼', medium: '🤲🏽', mediumDark: '🤲🏾', dark: '🤲🏿' },
  '🤝': { light: '🤝🏻', mediumLight: '🤝🏼', medium: '🤝🏽', mediumDark: '🤝🏾', dark: '🤝🏿' },
  '🙏': { light: '🙏🏻', mediumLight: '🙏🏼', medium: '🙏🏽', mediumDark: '🙏🏾', dark: '🙏🏿' },
  '✍️': { light: '✍🏻', mediumLight: '✍🏼', medium: '✍🏽', mediumDark: '✍🏾', dark: '✍🏿' },
  '💅': { light: '💅🏻', mediumLight: '💅🏼', medium: '💅🏽', mediumDark: '💅🏾', dark: '💅🏿' },
  '🤳': { light: '🤳🏻', mediumLight: '🤳🏼', medium: '🤳🏽', mediumDark: '🤳🏾', dark: '🤳🏿' },
  '💪': { light: '💪🏻', mediumLight: '💪🏼', medium: '💪🏽', mediumDark: '💪🏾', dark: '💪🏿' },

  // Personas y cuerpos
  '👶': { light: '👶🏻', mediumLight: '👶🏼', medium: '👶🏽', mediumDark: '👶🏾', dark: '👶🏿' },
  '🧒': { light: '🧒🏻', mediumLight: '🧒🏼', medium: '🧒🏽', mediumDark: '🧒🏾', dark: '🧒🏿' },
  '👦': { light: '👦🏻', mediumLight: '👦🏼', medium: '👦🏽', mediumDark: '👦🏾', dark: '👦🏿' },
  '👧': { light: '👧🏻', mediumLight: '👧🏼', medium: '👧🏽', mediumDark: '👧🏾', dark: '👧🏿' },
  '🧑': { light: '🧑🏻', mediumLight: '🧑🏼', medium: '🧑🏽', mediumDark: '🧑🏾', dark: '🧑🏿' },
  '👩': { light: '👩🏻', mediumLight: '👩🏼', medium: '👩🏽', mediumDark: '👩🏾', dark: '👩🏿' },
  '🧔': { light: '🧔🏻', mediumLight: '🧔🏼', medium: '🧔🏽', mediumDark: '🧔🏾', dark: '🧔🏿' },
  '👨': { light: '👨🏻', mediumLight: '👨🏼', medium: '👨🏽', mediumDark: '👨🏾', dark: '👨🏿' },
  '👱': { light: '👱🏻', mediumLight: '👱🏼', medium: '👱🏽', mediumDark: '👱🏾', dark: '👱🏿' },
  '👴': { light: '👴🏻', mediumLight: '👴🏼', medium: '👴🏽', mediumDark: '👴🏾', dark: '👴🏿' },
  '👵': { light: '👵🏻', mediumLight: '👵🏼', medium: '👵🏽', mediumDark: '👵🏾', dark: '👵🏿' },
  '🙍': { light: '🙍🏻', mediumLight: '🙍🏼', medium: '🙍🏽', mediumDark: '🙍🏾', dark: '🙍🏿' },
  '🙎': { light: '🙎🏻', mediumLight: '🙎🏼', medium: '🙎🏽', mediumDark: '🙎🏾', dark: '🙎🏿' },
  '🙅': { light: '🙅🏻', mediumLight: '🙅🏼', medium: '🙅🏽', mediumDark: '🙅🏾', dark: '🙅🏿' },
  '🙆': { light: '🙆🏻', mediumLight: '🙆🏼', medium: '🙆🏽', mediumDark: '🙆🏾', dark: '🙆🏿' },
  '💁': { light: '💁🏻', mediumLight: '💁🏼', medium: '💁🏽', mediumDark: '💁🏾', dark: '💁🏿' },
  '🙋': { light: '🙋🏻', mediumLight: '🙋🏼', medium: '🙋🏽', mediumDark: '🙋🏾', dark: '🙋🏿' },
  '🙇': { light: '🙇🏻', mediumLight: '🙇🏼', medium: '🙇🏽', mediumDark: '🙇🏾', dark: '🙇🏿' },
  '🤦': { light: '🤦🏻', mediumLight: '🤦🏼', medium: '🤦🏽', mediumDark: '🤦🏾', dark: '🤦🏿' },
  '🤷': { light: '🤷🏻', mediumLight: '🤷🏼', medium: '🤷🏽', mediumDark: '🤷🏾', dark: '🤷🏿' },
  '💆': { light: '💆🏻', mediumLight: '💆🏼', medium: '💆🏽', mediumDark: '💆🏾', dark: '💆🏿' },
  '💇': { light: '💇🏻', mediumLight: '💇🏼', medium: '💇🏽', mediumDark: '💇🏾', dark: '💇🏿' },
  '🚶': { light: '🚶🏻', mediumLight: '🚶🏼', medium: '🚶🏽', mediumDark: '🚶🏾', dark: '🚶🏿' },
  '🏃': { light: '🏃🏻', mediumLight: '🏃🏼', medium: '🏃🏽', mediumDark: '🏃🏾', dark: '🏃🏿' },
  '💃': { light: '💃🏻', mediumLight: '💃🏼', medium: '💃🏽', mediumDark: '💃🏾', dark: '💃🏿' },
  '🕺': { light: '🕺🏻', mediumLight: '🕺🏼', medium: '🕺🏽', mediumDark: '🕺🏾', dark: '🕺🏿' },
  '🧖': { light: '🧖🏻', mediumLight: '🧖🏼', medium: '🧖🏽', mediumDark: '🧖🏾', dark: '🧖🏿' },
  '🧘': { light: '🧘🏻', mediumLight: '🧘🏼', medium: '🧘🏽', mediumDark: '🧘🏾', dark: '🧘🏿' },
  '🛀': { light: '🛀🏻', mediumLight: '🛀🏼', medium: '🛀🏽', mediumDark: '🛀🏾', dark: '🛀🏿' },
  '🛌': { light: '🛌🏻', mediumLight: '🛌🏼', medium: '🛌🏽', mediumDark: '🛌🏾', dark: '🛌🏿' },
  '🏋️': { light: '🏋🏻', mediumLight: '🏋🏼', medium: '🏋🏽', mediumDark: '🏋🏾', dark: '🏋🏿' },
  '🤸': { light: '🤸🏻', mediumLight: '🤸🏼', medium: '🤸🏽', mediumDark: '🤸🏾', dark: '🤸🏿' },
  '🤼': { light: '🤼🏻', mediumLight: '🤼🏼', medium: '🤼🏽', mediumDark: '🤼🏾', dark: '🤼🏿' },
  '🤽': { light: '🤽🏻', mediumLight: '🤽🏼', medium: '🤽🏽', mediumDark: '🤽🏾', dark: '🤽🏿' },
  '🤾': { light: '🤾🏻', mediumLight: '🤾🏼', medium: '🤾🏽', mediumDark: '🤾🏾', dark: '🤾🏿' },
  '🤹': { light: '🤹🏻', mediumLight: '🤹🏼', medium: '🤹🏽', mediumDark: '🤹🏾', dark: '🤹🏿' },
  '🧙': { light: '🧙🏻', mediumLight: '🧙🏼', medium: '🧙🏽', mediumDark: '🧙🏾', dark: '🧙🏿' },
  '🧚': { light: '🧚🏻', mediumLight: '🧚🏼', medium: '🧚🏽', mediumDark: '🧚🏾', dark: '🧚🏿' },
  '🧛': { light: '🧛🏻', mediumLight: '🧛🏼', medium: '🧛🏽', mediumDark: '🧛🏾', dark: '🧛🏿' },
  '🧜': { light: '🧜🏻', mediumLight: '🧜🏼', medium: '🧜🏽', mediumDark: '🧜🏾', dark: '🧜🏿' },
  '🧝': { light: '🧝🏻', mediumLight: '🧝🏼', medium: '🧝🏽', mediumDark: '🧝🏾', dark: '🧝🏿' },
  '🧞': { light: '🧞🏻', mediumLight: '🧞🏼', medium: '🧞🏽', mediumDark: '🧞🏾', dark: '🧞🏿' },
  '🧟': { light: '🧟🏻', mediumLight: '🧟🏼', medium: '🧟🏽', mediumDark: '🧟🏾', dark: '🧟🏿' },
  '👮': { light: '👮🏻', mediumLight: '👮🏼', medium: '👮🏽', mediumDark: '👮🏾', dark: '👮🏿' },
  '🕵️': { light: '🕵🏻', mediumLight: '🕵🏼', medium: '🕵🏽', mediumDark: '🕵🏾', dark: '🕵🏿' },
  '💂': { light: '💂🏻', mediumLight: '💂🏼', medium: '💂🏽', mediumDark: '💂🏾', dark: '💂🏿' },
  '👷': { light: '👷🏻', mediumLight: '👷🏼', medium: '👷🏽', mediumDark: '👷🏾', dark: '👷🏿' },
  '🤴': { light: '🤴🏻', mediumLight: '🤴🏼', medium: '🤴🏽', mediumDark: '🤴🏾', dark: '🤴🏿' },
  '👸': { light: '👸🏻', mediumLight: '👸🏼', medium: '👸🏽', mediumDark: '👸🏾', dark: '👸🏿' },
  '👳': { light: '👳🏻', mediumLight: '👳🏼', medium: '👳🏽', mediumDark: '👳🏾', dark: '👳🏿' },
  '👲': { light: '👲🏻', mediumLight: '👲🏼', medium: '👲🏽', mediumDark: '👲🏾', dark: '👲🏿' },
  '🧕': { light: '🧕🏻', mediumLight: '🧕🏼', medium: '🧕🏽', mediumDark: '🧕🏾', dark: '🧕🏿' },
  '🤵': { light: '🤵🏻', mediumLight: '🤵🏼', medium: '🤵🏽', mediumDark: '🤵🏾', dark: '🤵🏿' },
  '👰': { light: '👰🏻', mediumLight: '👰🏼', medium: '👰🏽', mediumDark: '👰🏾', dark: '👰🏿' },
  '🤰': { light: '🤰🏻', mediumLight: '🤰🏼', medium: '🤰🏽', mediumDark: '🤰🏾', dark: '🤰🏿' },
  '🤱': { light: '🤱🏻', mediumLight: '🤱🏼', medium: '🤱🏽', mediumDark: '🤱🏾', dark: '🤱🏿' },
  '👼': { light: '👼🏻', mediumLight: '👼🏼', medium: '👼🏽', mediumDark: '👼🏾', dark: '👼🏿' },
  '🎅': { light: '🎅🏻', mediumLight: '🎅🏼', medium: '🎅🏽', mediumDark: '🎅🏾', dark: '🎅🏿' },
  '🤶': { light: '🤶🏻', mediumLight: '🤶🏼', medium: '🤶🏽', mediumDark: '🤶🏾', dark: '🤶🏿' },
  '🦸': { light: '🦸🏻', mediumLight: '🦸🏼', medium: '🦸🏽', mediumDark: '🦸🏾', dark: '🦸🏿' },
  '🦹': { light: '🦹🏻', mediumLight: '🦹🏼', medium: '🦹🏽', mediumDark: '🦹🏾', dark: '🦹🏿' },

  // Familias y parejas (emojis compuestos, usar la variante completa)
  '🧑‍🤝‍🧑': { light: '🧑🏻‍🤝‍🧑🏻', mediumLight: '🧑🏼‍🤝‍🧑🏼', medium: '🧑🏽‍🤝‍🧑🏽', mediumDark: '🧑🏾‍🤝‍🧑🏾', dark: '🧑🏿‍🤝‍🧑🏿' },
  '👩‍❤️‍👨': { light: '👩🏻‍❤️‍👨🏻', mediumLight: '👩🏼‍❤️‍👨🏼', medium: '👩🏽‍❤️‍👨🏽', mediumDark: '👩🏾‍❤️‍👨🏾', dark: '👩🏿‍❤️‍👨🏿' },
  '👨‍❤️‍👨': { light: '👨🏻‍❤️‍👨🏻', mediumLight: '👨🏼‍❤️‍👨🏼', medium: '👨🏽‍❤️‍👨🏽', mediumDark: '👨🏾‍❤️‍👨🏾', dark: '👨🏿‍❤️‍👨🏿' },
  '👩‍❤️‍👩': { light: '👩🏻‍❤️‍👩🏻', mediumLight: '👩🏼‍❤️‍👩🏼', medium: '👩🏽‍❤️‍👩🏽', mediumDark: '👩🏾‍❤️‍👩🏾', dark: '👩🏿‍❤️‍👩🏿' },
  '👩‍❤️‍💋‍👨': { light: '👩🏻‍❤️‍💋‍👨🏻', mediumLight: '👩🏼‍❤️‍💋‍👨🏼', medium: '👩🏽‍❤️‍💋‍👨🏽', mediumDark: '👩🏾‍❤️‍💋‍👨🏾', dark: '👩🏿‍❤️‍💋‍👨🏿' },
  '👨‍❤️‍💋‍👨': { light: '👨🏻‍❤️‍💋‍👨🏻', mediumLight: '👨🏼‍❤️‍💋‍👨🏼', medium: '👨🏽‍❤️‍💋‍👨🏽', mediumDark: '👨🏾‍❤️‍💋‍👨🏾', dark: '👨🏿‍❤️‍💋‍👨🏿' },
  '👩‍❤️‍💋‍👩': { light: '👩🏻‍❤️‍💋‍👩🏻', mediumLight: '👩🏼‍❤️‍💋‍👩🏼', medium: '👩🏽‍❤️‍💋‍👩🏽', mediumDark: '👩🏾‍❤️‍💋‍👩🏾', dark: '👩🏿‍❤️‍💋‍👩🏿' },
  '👪': { light: '👪🏻', mediumLight: '👪🏼', medium: '👪🏽', mediumDark: '👪🏾', dark: '👪🏿' }
};

export function setSkinTone(tone) {
  const valid = ['default', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'];
  if (valid.includes(tone)) {
    currentTone = tone;
    localStorage.setItem('manual_skin_tone', tone);
    applySkinToneToDocument(); // actualiza todos los emojis visibles
  }
}

export function getSkinTone() {
  return currentTone;
}

// Aplica el tono de piel a un texto dado (reemplaza emojis según el mapa)
export function applySkinToneToText(text) {
  if (currentTone === 'default') return text;
  let result = text;
  for (const [base, variants] of Object.entries(SKIN_TONE_MAP)) {
    const replacement = variants[currentTone];
    if (replacement) {
      // Reemplazar todas las ocurrencias (global)
      result = result.replace(new RegExp(base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }
  }
  return result;
}

// Aplica el tono de piel a un elemento del DOM (reemplaza los nodos de texto)
function applySkinToneToElement(element) {
  if (currentTone === 'default') return;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent && (parent.classList?.contains('emoji-item') || parent.classList?.contains('category-btn'))) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodesToReplace = [];
  while (walker.nextNode()) nodesToReplace.push(walker.currentNode);
  
  nodesToReplace.forEach(textNode => {
    const originalText = textNode.textContent;
    const newText = applySkinToneToText(originalText);
    if (newText !== originalText) {
      const span = document.createElement('span');
      span.textContent = newText;
      span.style.fontFamily = "'Noto Color Emoji', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiOne Color', 'Twemoji Mozilla', sans-serif";
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

export function applySkinToneToDocument() {
  applySkinToneToElement(document.body);
}

