// src/scripts/position.js
export function computeLayout({ anchorRect, popupRect, menuRect, viewportW, viewportH, isLastVisibleMessage = false }) {
  const popupLeft = (viewportW - popupRect.width) / 2;
  const popupTop = (viewportH - popupRect.height - menuRect.height - 16) / 2;
  
  const menuLeft = (viewportW - menuRect.width) / 2;
  const menuTop = popupTop + popupRect.height + 8;

  return {
    popup: { left: popupLeft, top: popupTop },
    menu: { left: menuLeft, top: menuTop },
    layout: 'center'
  };
}