export function addResizeHandlesToModal(element) {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  handles.forEach(dir => {
    let handle = element.querySelector(`.resize-action.resize-${dir}`);
    if (!handle) {
      handle = document.createElement('div');
      handle.className = `resize-action resize-${dir}`;
      element.appendChild(handle);
    }
  });
}