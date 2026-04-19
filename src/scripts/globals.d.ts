export {};

declare global {
  interface Window {
    isAtBottom: boolean;
    smoothScrollToBottom: () => void;
    ensureLastMessageAboveInput: (keyboardHeight: number) => void;
    ensureLastMessageVisible: () => void;
    keyboardOpen: boolean;
    _deletedMessageBackup?: HTMLElement | null;
    _deletedMessageNextSibling?: Node | null;
    _deletedMessageParent?: HTMLElement | null;
  }

  interface Navigator {
    vibrate?: (pattern: number | number[]) => boolean;
  }
}
