// SizeManager.js
class SizeManager {
    constructor() {
        this.keyboardHeight = 0;
        this.isKeyboardOpen = false;
        this.listeners = [];
        this.init();
    }

    init() {
        // Verificar disponibilidad de la API en el entorno
        if (!window.visualViewport) {
            console.warn('SizeManager: visualViewport API no soportada.');
            return;
        }

        // Escuchar cambios en el viewport visual y llamar a handleResize
        window.visualViewport.addEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        const visualHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const newKeyboardHeight = Math.max(0, windowHeight - visualHeight);

        // Solo actualizamos si la altura del teclado ha cambiado significativamente
        if (Math.abs(this.keyboardHeight - newKeyboardHeight) > 10) {
            this.keyboardHeight = newKeyboardHeight;
            this.isKeyboardOpen = this.keyboardHeight > 150; // Umbral de 150px
            this.notifyListeners();
        }
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback({
            keyboardHeight: this.keyboardHeight,
            isOpen: this.isKeyboardOpen
        }));
    }

    getKeyboardHeight() {
        return this.keyboardHeight;
    }

    getKeyboardState() {
        return this.isKeyboardOpen;
    }
}

const sizeManagerInstance = new SizeManager();

export default sizeManagerInstance;