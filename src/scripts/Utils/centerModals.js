let windowX = 0, windowY = 0;
let windowElement, headerElement, closeBtn, overlay;

export function centerModal() {
  if (!windowElement) return;
  windowElement.offsetHeight;
  const rect = windowElement.getBoundingClientRect();
  const modalWidth = rect.width;
  const modalHeight = rect.height;
  windowX = (window.innerWidth - modalWidth) / 2;
  windowY = (window.innerHeight - modalHeight) / 2;
  windowElement.style.transform = `translate3d(${windowX}px, ${windowY}px, 0)`;
  windowElement.setAttribute('data-x', windowX);
  windowElement.setAttribute('data-y', windowY);
}