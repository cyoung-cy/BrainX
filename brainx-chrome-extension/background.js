// background.js - Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'brainx-capture',
    title: 'BrainX에 저장',
    contexts: ['page', 'selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'brainx-capture') return;
  chrome.action.openPopup();
});

// 팝업에서 badge 업데이트 요청 처리
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SET_BADGE') {
    chrome.action.setBadgeText({ text: request.text || '' });
    chrome.action.setBadgeBackgroundColor({ color: request.color || '#6366f1' });
    sendResponse({ ok: true });
  }
  return true;
});
