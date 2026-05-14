const SOUNDS = {
  click: { url: '/sounds/click.mp3', volume: 0.3, preload: true },
  messageSend: { url: '/sounds/message-send.mp3', volume: 1, preload: true },
  messageReceive: { url: '/sounds/message-receive.mp3', volume: 0.4, preload: true },
  messageSendQuick: { url: '/sounds/message-send-quick.mp3', volume: 0.35, preload: true },
  notification: { url: '/sounds/notification.mp3', volume: 0.5, preload: true },
  reactionAdd: { url: '/sounds/reaction-add.mp3', volume: 0.55, preload: true },
  reactionRemove: { url: '/sounds/reaction-remove.mp3', volume: 0.25, preload: true },
  keyboard: { url: '/sounds/click.mp3', volume: 0.1, preload: true },
  popupClose: { url: '/sounds/click.mp3', volume: 0.2, preload: true }
};

let audioContext = null;
let soundBuffers = new Map();
let isEnabled = true;
let isInitialized = false;
let globalVolume = 0.5;
let currentPlayingSounds = new Set();

async function loadSound(key) {
  const config = SOUNDS[key];
  if (!config) return null;
  
  try {
    const response = await fetch(config.url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    soundBuffers.set(key, audioBuffer);
    return audioBuffer;
  } catch (error) {
    console.warn(`No se pudo cargar el sonido: ${key}`, error);
    return null;
  }
}

export async function initSoundManager() {
  if (isInitialized) return true;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    isInitialized = true;
    const loadPromises = Object.keys(SOUNDS).map(key => loadSound(key));
    await Promise.allSettled(loadPromises);
    return true;
  } catch (error) {
    console.warn('No se pudo inicializar AudioContext', error);
    return false;
  }
}

export async function playSound(soundKey, options = {}) {
  if (!isEnabled) return;
  
  const soundEnabled = localStorage.getItem(`sound_${soundKey}_enabled`);
  if (soundEnabled !== null && soundEnabled !== 'true') return;
  
  const savedVolume = localStorage.getItem(`sound_${soundKey}_volume`);
  const individualVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.5;
  
  if (!audioContext || audioContext.state === 'closed') {
    await initSoundManager();
  }
  if (!audioContext || audioContext.state === 'closed') return;
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  const buffer = soundBuffers.get(soundKey);
  if (!buffer) return;
  
  const config = SOUNDS[soundKey];
  const volume = options.volume !== undefined ? options.volume : (config?.volume || 0.5) * individualVolume;
  
  try {
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.value = Math.min(1, Math.max(0, volume));
    
    const soundId = `${soundKey}_${Date.now()}_${Math.random()}`;
    currentPlayingSounds.add(soundId);
    
    source.onended = () => {
      currentPlayingSounds.delete(soundId);
    };
    
    source.start();
  } catch (error) {
    console.warn(`Error reproduciendo sonido ${soundKey}:`, error);
  }
}

export function enableSounds() {
  isEnabled = true;
  localStorage.setItem('sounds_enabled', 'true');
}

export function disableSounds() {
  isEnabled = false;
  localStorage.setItem('sounds_enabled', 'false');
}

export function toggleSounds() {
  isEnabled = !isEnabled;
  localStorage.setItem('sounds_enabled', isEnabled ? 'true' : 'false');
  return isEnabled;
}

export function isSoundEnabled() {
  return isEnabled;
}

export function setGlobalVolume(volume) {
  globalVolume = Math.min(1, Math.max(0, volume));
  localStorage.setItem('sounds_volume', globalVolume.toString());
}

export function getGlobalVolume() {
  return globalVolume;
}

export async function preloadAllSounds() {
  if (!audioContext) await initSoundManager();
  const loadPromises = Object.keys(SOUNDS).map(key => loadSound(key));
  await Promise.allSettled(loadPromises);
}

export function loadSoundPreferences() {
  const savedEnabled = localStorage.getItem('sounds_enabled');
  if (savedEnabled !== null) {
    isEnabled = savedEnabled === 'true';
  }
  
  const savedVolume = localStorage.getItem('sounds_volume');
  if (savedVolume !== null) {
    globalVolume = parseFloat(savedVolume);
  }
}

export const playMessageSend = () => playSound('messageSend');
export const playMessageReceive = () => playSound('messageReceive');
export const playClick = () => playSound('click');
export const playButtonHover = () => playSound('buttonHover');
export const playNotification = () => playSound('notification');
export const playReactionAdd = () => playSound('reactionAdd');
export const playReactionRemove = () => playSound('reactionRemove');
export const playError = () => playSound('error');
export const playKeyboard = () => playSound('keyboard');
export const playMessageSendQuick = () => playSound('messageSendQuick');
export const playPopupClose = () => playSound('popupClose');


export default {
  init: initSoundManager,
  play: playSound,
  enable: enableSounds,
  disable: disableSounds,
  toggle: toggleSounds,
  isEnabled: isSoundEnabled,
  setVolume: setGlobalVolume,
  getVolume: getGlobalVolume,
  preloadAll: preloadAllSounds,
  playMessageSend,
  playMessageReceive,
  playClick,
  playButtonHover,
  playNotification,
  playReactionAdd,
  playReactionRemove,
  playError,
  playKeyboard,
  playMessageSendQuick,
  playPopupClose
};

