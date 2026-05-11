import { getCustomEmojiByShortcode } from './CustomEmojiPicker.js';
import { loadCustomEmojis as loadEmojiData } from './EmojiPicker/EmojiData.js';
import { getStaticEmojiCategories } from './StaticEmojiCategories.js';
import { isStaticCategoryDisabled } from './CustomEmojiManager.js';

function getCustomEmojiUnified(shortcode) {
  if (window._customEmojiData) {
    const found = window._customEmojiData.find(e => e.shortcodes.includes(shortcode));
    if (found) return found;
  }
  const staticCategories = getStaticEmojiCategories();
  for (const cat of staticCategories) {
    if (isStaticCategoryDisabled(cat.name)) continue;
    const found = cat.emojis.find(e => e.shortcodes.includes(shortcode));
    if (found) return found;
  }
  return getCustomEmojiByShortcode(shortcode);
}

export function loadCustomEmojis() {
  return loadEmojiData();
}

export function convertShortcodesToImages(text) {
  if (!text) return text;
  const shortcodeRegex = /:([a-zA-Z0-9_]+):/g;
  return text.replace(shortcodeRegex, (match, shortcode) => {
    const customEmoji = getCustomEmojiUnified(shortcode);
    if (customEmoji) {
      if (customEmoji.svg) {
        let svgHtml = customEmoji.svg;
        if (svgHtml.includes('<svg')) {
          svgHtml = svgHtml.replace(/<svg/, '<svg style="width:100%; height:100%; display:block" contenteditable="false"');
        }
        return `<span data-shortcode="${match}" contenteditable="false" style="display:inline-block;width:auto;height:auto;vertical-align:middle;line-height:1;">${svgHtml}</span>`;
      } else if (customEmoji.url) {
        return `<img src="${customEmoji.url}" alt="${customEmoji.name}" data-shortcode="${match}" style="width:auto;height:auto;vertical-align:middle;display:inline-block;border-radius:4px;">`;
      }
    }
    return match;
  });
}

export function convertShortcodesToImagesInNode(node) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (parent && (parent.closest('.emoji-item') || parent.closest('.category-btn') || parent.classList?.contains('twemoji-processed'))) return;
    const converted = convertShortcodesToImages(node.textContent);
    if (converted !== node.textContent) {
      const span = document.createElement('span');
      span.className = 'emoji-converted-span';
      span.innerHTML = converted;
      parent.replaceChild(span, node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    Array.from(node.childNodes).forEach(child => convertShortcodesToImagesInNode(child));
  }
}