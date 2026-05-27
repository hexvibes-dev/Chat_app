import { appendMessage } from './Messages/messages.js';

let devMode = true;

export function generateDevMessages() {
  if (!devMode) return;
  
  setTimeout(() => {
    appendMessage('Ella tiene un tin', { me: false });
  }, 100);
  
  setTimeout(() => {
    appendMessage('En la grasa habia mejores momos', { me: true });
  }, 100);
  
  setTimeout(() => {
    appendMessage('Tizongolamaya', { me: true });
  }, 100);
  
  setTimeout(() => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    appendMessage('Guibel reacciona a los podcast de las mujeres deben parar', { 
      me: false,
      msgId: msgId,
      replyTo: {
        id: 'local-2',
        author: 'El bombero de los dedos de fuego',
        text: 'Tizongolamaya'
      }
    });
  }, 100);
  
  setTimeout(() => {
    appendMessage('Ichi ni san nya arigatooo~~', { 
      me: true,
      replyTo: {
        id: `msg-${Date.now() - 2000}-${Math.random().toString(36).slice(2, 7)}`,
        author: 'Tipa tiburón',
        text: 'Guibel reacciona a los podcast de las mujeres deben parar'
      }
    });
  }, 100);
}