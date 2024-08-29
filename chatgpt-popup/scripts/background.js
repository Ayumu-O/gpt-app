console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPageContent') {
    chrome.scripting.executeScript(
      {
        target: { tabId: sender.tab.id },
        function: () => document.documentElement.outerHTML,
      },
      (results) => {
        sendResponse({ content: results[0].result });
      }
    );

    return true; // 非同期で応答を送信することを示す
  }
});
