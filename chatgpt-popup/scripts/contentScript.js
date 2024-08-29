console.log('Content script loaded');

// ページの内容を取得してバックグラウンドスクリプトに送信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const pageContent = document.documentElement.outerHTML; // ページ全体のHTMLを取得
    sendResponse({ content: pageContent });
  }
});
