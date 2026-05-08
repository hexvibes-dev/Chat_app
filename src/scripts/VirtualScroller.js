export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.itemHeight = options.itemHeight || 60;
    this.bufferSize = options.bufferSize || 5;
    this.renderItem = options.renderItem;
    this.onScrollEnd = options.onScrollEnd;
    this.totalItems = 0;
    this.items = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.scrollTop = 0;
    this.rafId = null;
    this.pendingScroll = false;
    this.init();
  }

  init() {
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';
    this.container.style.height = '400px';
    this.scrollableDiv = document.createElement('div');
    this.scrollableDiv.style.position = 'absolute';
    this.scrollableDiv.style.top = '0';
    this.scrollableDiv.style.left = '0';
    this.scrollableDiv.style.width = '1px';
    this.scrollableDiv.style.height = '0';
    this.container.appendChild(this.scrollableDiv);
    this.contentDiv = document.createElement('div');
    this.contentDiv.style.position = 'relative';
    this.contentDiv.style.width = '100%';
    this.container.appendChild(this.contentDiv);
    this.container.addEventListener('scroll', () => this.onScroll());
  }

  setTotalItems(count) {
    this.totalItems = count;
    this.scrollableDiv.style.height = `${count * this.itemHeight}px`;
    this.updateVisibleRange();
  }

  setItems(items) {
    this.items = items;
    this.setTotalItems(items.length);
  }

  onScroll() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const newScrollTop = this.container.scrollTop;
      if (Math.abs(newScrollTop - this.scrollTop) > this.itemHeight) {
        this.scrollTop = newScrollTop;
        this.updateVisibleRange();
        if (this.onScrollEnd && newScrollTop + this.container.clientHeight >= this.container.scrollHeight - this.itemHeight * 2) {
          this.onScrollEnd();
        }
      }
      this.rafId = null;
    });
  }

  updateVisibleRange() {
    const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
    const end = Math.min(this.totalItems, Math.ceil((this.scrollTop + this.container.clientHeight) / this.itemHeight) + this.bufferSize);
    if (start === this.startIndex && end === this.endIndex) return;
    this.startIndex = start;
    this.endIndex = end;
    this.render();
  }

  render() {
    const fragment = document.createDocumentFragment();
    for (let i = this.startIndex; i < this.endIndex; i++) {
      const item = this.items[i];
      if (item) {
        const element = this.renderItem(item, i);
        element.style.position = 'absolute';
        element.style.top = `${i * this.itemHeight}px`;
        element.style.left = '0';
        element.style.width = '100%';
        fragment.appendChild(element);
      }
    }
    this.contentDiv.innerHTML = '';
    this.contentDiv.appendChild(fragment);
    this.contentDiv.style.height = `${(this.endIndex - this.startIndex) * this.itemHeight}px`;
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.container.removeEventListener('scroll', () => this.onScroll());
  }
}