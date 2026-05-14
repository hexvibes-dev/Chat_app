import 'emoji-picker-element';

export const customEmojiCollection = [];


export function createCustomEmojiPicker() {
  const picker = document.createElement('emoji-picker');
  picker.customEmoji = customEmojiCollection;
  return picker;
}

export function getCustomEmojiByShortcode(shortcode) {
  return null;
}

export function getCustomEmojiByUrl(url) {
  return null;
}

export function isAnimatedEmoji(emojiData) {
  return false;
}

export function getAnimationType(emojiData) {
  return null;
}