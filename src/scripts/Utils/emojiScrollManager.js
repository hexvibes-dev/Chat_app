class EmojiScrollManager {
    constructor(messagesContainer, inputElement) {
        this.messages = messagesContainer;
        this.input = inputElement;
        this.isEmojiPickerOpen = false;
        this.lastKnownScrollPosition = 0;
        this.keyboardHeight = 0;

        if (!this.messages || !this.input) return;

        this.init();
    }

    init() {
        window.addEventListener('picker-opened', () => {
            this.lastKnownScrollPosition = this.messages.scrollTop;
            this.isEmojiPickerOpen = true;
            this.adjustLayoutForPicker(true);
        });

        window.addEventListener('picker-closed', () => {
            this.isEmojiPickerOpen = false;
            this.adjustLayoutForPicker(false);
            this.restoreScrollPosition();
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.handleKeyboardResize.bind(this));
        }

        this.input.addEventListener('focus', () => {
            if (this.isEmojiPickerOpen) {
                this.closeEmojiPicker();
            }
        });
        
        document.addEventListener('sticker-sent', () => {
            this.scrollToBottom();
        });
    }

    handleKeyboardResize() {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const newKeyboardHeight = windowHeight - viewportHeight;

        if (newKeyboardHeight > 100 && this.keyboardHeight === 0) {
            if (this.isEmojiPickerOpen) this.closeEmojiPicker();
        } else if (newKeyboardHeight === 0 && this.keyboardHeight > 0) {
            setTimeout(() => this.restoreScrollPosition(), 50);
        }
        this.keyboardHeight = newKeyboardHeight;
    }

    adjustLayoutForPicker(isOpening) {
        if (isOpening) {
            this.messages.style.transition = 'bottom 0.2s ease-out';
            this.messages.style.bottom = '400px';
        } else {
            this.messages.style.bottom = '';
            setTimeout(() => this.messages.style.transition = '', 300);
        }
    }

    restoreScrollPosition() {
        if (this.lastKnownScrollPosition !== undefined) {
            this.messages.scrollTop = this.lastKnownScrollPosition;
            this.lastKnownScrollPosition = null;
        }
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    closeEmojiPicker() {
        const closeEvent = new CustomEvent('picker-closed');
        window.dispatchEvent(closeEvent);
    }
}

let scrollManager = null;
export const initEmojiScrollManager = (messagesContainer, inputElement) => {
    if (!scrollManager && messagesContainer && inputElement) {
        scrollManager = new EmojiScrollManager(messagesContainer, inputElement);
    }
    return scrollManager;
};