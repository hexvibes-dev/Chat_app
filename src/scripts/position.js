//src/scripts/position.js

const VISIBILITY_THRESHOLD = 100;
const GAP = 8;
const TOP_GAP = 2;
const POPUP_TOP_GAP = 2;
const BOTTOM_GAP = 6;

export function getPositionMode(rect, viewportH, isLastVisibleMessage = false) {
  const isTooTall = rect.height > viewportH * 0.9;
  if (isTooTall) return 'CENTER';
  if (isLastVisibleMessage) return 'LAST_VISIBLE';

  const spaceAbove = rect.top;
  const spaceBelow = viewportH - rect.bottom;
  const isCoveredByHeader = spaceAbove < VISIBILITY_THRESHOLD && spaceAbove >= 0;
  if (isCoveredByHeader) return 'PARTIAL_TOP_VISIBLE';
  const isCoveredByInput = spaceBelow < VISIBILITY_THRESHOLD && spaceBelow >= 0;
  if (isCoveredByInput) return 'PARTIAL_BOTTOM_VISIBLE';

  const onlyTopVisible = rect.top >= 0 && rect.bottom > viewportH;
  const onlyBottomVisible = rect.top < 0 && rect.bottom <= viewportH;
  if (onlyTopVisible && spaceAbove < 100) return 'FORCE_TOP';
  if (onlyBottomVisible && spaceBelow < 100) return 'FORCE_BOTTOM';
  if (rect.top >= 0 && rect.bottom <= viewportH) return 'NORMAL';
  return 'AUTO';
}

export function computeLayout({ anchorRect, popupRect, menuRect, viewportW, viewportH, isLastVisibleMessage = false }) {
  const mode = getPositionMode(anchorRect, viewportH, isLastVisibleMessage);

  let popupLeft, popupTop;
  let layout = 'bottom';

  popupLeft = anchorRect.left + (anchorRect.width / 2) - (popupRect.width / 2);
  popupLeft = Math.max(8, Math.min(popupLeft, viewportW - popupRect.width - 8));

  if (mode === 'CENTER') {
    popupLeft = (viewportW / 2) - (popupRect.width / 2);
    popupTop = (viewportH / 2) - popupRect.height - GAP;
    layout = 'center';
  }
  else if (mode === 'LAST_VISIBLE') {
    popupTop = anchorRect.top - popupRect.height - POPUP_TOP_GAP;
    layout = 'top';
  }
  else if (mode === 'PARTIAL_TOP_VISIBLE') {
    popupTop = anchorRect.bottom + GAP;
    layout = 'bottom';
  }
  else if (mode === 'PARTIAL_BOTTOM_VISIBLE') {
    popupTop = anchorRect.top - popupRect.height - GAP;
    layout = 'top';
  }
  else if (mode === 'FORCE_TOP') {
    popupTop = anchorRect.top - popupRect.height - GAP;
    layout = 'top';
  }
  else if (mode === 'FORCE_BOTTOM') {
    popupTop = anchorRect.bottom + GAP;
    layout = 'bottom';
  }
  else if (mode === 'NORMAL') {
    popupTop = anchorRect.top - popupRect.height - 10;
    if (popupTop < 8) popupTop = anchorRect.bottom + 10;
    layout = 'bottom';
  }
  else {
    const spaceAbove = anchorRect.top;
    const spaceBelow = viewportH - anchorRect.bottom;
    if (spaceAbove > popupRect.height + 20) {
      popupTop = anchorRect.top - popupRect.height - GAP;
      layout = 'top';
    } else {
      popupTop = anchorRect.bottom + GAP;
      layout = 'bottom';
    }
  }

  if (popupTop < 8) popupTop = 8;
  if (popupTop + popupRect.height > viewportH - 8) {
    popupTop = viewportH - popupRect.height - 8;
  }

  let menuLeft = popupLeft + popupRect.width / 2 - menuRect.width / 2;
  menuLeft = Math.max(8, Math.min(menuLeft, viewportW - menuRect.width - 8));

  let menuTop;
  if (layout === 'center') {
    menuLeft = (viewportW / 2) - (menuRect.width / 2);
    menuTop = (viewportH / 2) + GAP;
  }
  else if (layout === 'top') {
    menuTop = popupTop - menuRect.height - TOP_GAP;
  }
  else {
    menuTop = popupTop + popupRect.height + BOTTOM_GAP;
  }

  if (menuTop < 8) menuTop = 8;
  if (menuTop + menuRect.height > viewportH - 8) {
    menuTop = viewportH - menuRect.height - 8;
  }

  return {
    popup: { left: popupLeft, top: popupTop },
    menu: { left: menuLeft, top: menuTop },
    layout
  };
}
