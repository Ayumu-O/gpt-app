document.addEventListener('DOMContentLoaded', function () {
  checkApiKeyStatus();
  loadSystemPrompt();
  loadPromptList();

  // ページの内容を取得するボタンをクリックしたとき
  document
    .getElementById('getPageContentBtn')
    .addEventListener('click', getPageContent);

  // システムプロンプトの保存
  document
    .getElementById('saveSystemPromptBtn')
    .addEventListener('click', function () {
      const systemPrompt = document.getElementById('systemPrompt').value;
      setSystemPrompt(systemPrompt);
    });
});

document.getElementById('saveApiKeyBtn').addEventListener('click', function () {
  const apiKey = document.getElementById('apiKey').value;
  if (apiKey) {
    setApiKey(apiKey);
    alert('APIキーが保存されました');
    checkApiKeyStatus();
  } else {
    alert('APIキーを入力してください');
  }
});

// ページ内容を取得して表示する処理
function getPageContent() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'getPageContent' },
      function (response) {
        displayPageContent(response);
      }
    );
  });
}

// 取得したページ内容を表示する処理
function displayPageContent(response) {
  if (response && response.content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.content, 'text/html');

    // タイトルを取得
    const title = doc.querySelector('title')
      ? doc.querySelector('title').innerText
      : 'タイトルが見つかりません';

    // 本文を取得 (body タグ内のテキスト)
    const bodyText = extractVisibleText(doc.body);

    // 取得した本文をユーザープロンプトに設定
    const userPrompt = `タイトル: ${title}\n\n本文:\n${bodyText}`;
    document.getElementById('userPrompt').value = userPrompt;
  } else {
    document.getElementById('response').textContent =
      'ページの内容を取得できませんでした。';
  }
}

// 見えるテキストのみを抽出する関数
function extractVisibleText(element) {
  let text = '';
  if (element) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'br' || tagName === 'p' || tagName === 'div') {
          text += '\n'; // 改行を追加
        }
        if (
          tagName !== 'script' &&
          tagName !== 'style' &&
          tagName !== 'img' &&
          tagName !== 'link' &&
          tagName !== 'meta'
        ) {
          text += extractVisibleText(node); // 再帰的に子要素のテキストを取得
        }
      }
    }
  }
  return text.trim();
}

// APIキーが設定済みか確認し、チェックマークを表示
function checkApiKeyStatus() {
  const apiKey = getApiKey();
  const apiKeyCheck = document.getElementById('apiKeyCheck');
  if (apiKey) {
    apiKeyCheck.style.display = 'inline';
  } else {
    apiKeyCheck.style.display = 'none';
  }
}

// システムプロンプトリストをロードしてサイドバーに表示する関数
function loadPromptList() {
  const promptList = getPromptList();
  const promptListElement = document.getElementById('promptList');
  promptListElement.innerHTML = ''; // リストをクリア

  promptList.forEach((prompt, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = prompt;

    // プロンプトを選択したときの処理
    listItem.addEventListener('click', function () {
      document.getElementById('systemPrompt').value = prompt;
      localStorage.setItem('systemPrompt', prompt); // 選択したプロンプトを保存
    });

    // 削除ボタンの作成
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#128465;'; // ゴミ箱アイコンのUnicode

    deleteButton.addEventListener('click', function (event) {
      event.stopPropagation(); // 親のクリックイベントをキャンセル
      removePrompt(index);
    });

    // リストアイテムに削除ボタンを追加
    listItem.appendChild(deleteButton);
    promptListElement.appendChild(listItem);
  });
}

// ChatGPTに質問する
document.getElementById('sendBtn').addEventListener('click', async function () {
  const apiKey = getApiKey();
  if (!apiKey) {
    alert('APIキーが設定されていません');
    return;
  }

  const systemPrompt = document.getElementById('systemPrompt').value;
  const userPrompt = document.getElementById('userPrompt').value;

  if (!userPrompt) {
    alert('ユーザープロンプトを入力してください');
    return;
  }

  const responseDiv = document.getElementById('response');
  responseDiv.textContent = '応答を取得中...';

  await sendRequestToChatGPT(apiKey, systemPrompt, userPrompt, responseDiv);
});

async function sendRequestToChatGPT(
  apiKey,
  systemPrompt,
  userPrompt,
  responseDiv
) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true, // ストリーミングを有効にする
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      responseDiv.textContent = `エラー: ${data.error.message}`;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // チャンクを新しい行ごとに分割
      const lines = chunk.split('\n');

      // 各行を処理
      for (const line of lines) {
        if (line.trim() === '') continue;
        // "data: " プレフィックスを削除してJSON部分を抽出
        const json = line.replace(/^data: /, '');
        if (json === '[DONE]') {
          break; // ストリームの終端
        }

        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices[0].delta?.content || '';
          result += content;
          responseDiv.textContent = result;
        } catch (e) {
          console.error('JSON parsing error:', e);
        }
      }
    }
  } catch (error) {
    responseDiv.textContent = `リクエスト中にエラーが発生しました: ${error.message}`;
  }
}

//// ローカルストレージ関連
// ローカルストレージからAPIキーを取得
function getApiKey() {
  return localStorage.getItem('apiKey');
}

// ローカルストレージにAPIキーを保存
function setApiKey(key) {
  localStorage.setItem('apiKey', key);
}

// システムプロンプトを保存する関数
function setSystemPrompt(prompt) {
  const promptList = getPromptList();
  promptList.unshift(prompt);
  localStorage.setItem('systemPromptList', JSON.stringify(promptList));
  loadPromptList(); // リストを再ロード
  localStorage.setItem('systemPrompt', prompt);
}

// システムプロンプトをロードする関数
function loadSystemPrompt() {
  const systemPrompt = localStorage.getItem('systemPrompt');
  if (systemPrompt) {
    document.getElementById('systemPrompt').value = systemPrompt;
  }
}

// プロンプトを削除する関数
function removePrompt(index) {
  const promptList = getPromptList();
  promptList.splice(index, 1); // 指定されたインデックスのプロンプトを削除
  localStorage.setItem('systemPromptList', JSON.stringify(promptList));
  loadPromptList(); // リストを再ロード
}

// ローカルストレージからプロンプトリストを取得する関数
function getPromptList() {
  const promptList = localStorage.getItem('systemPromptList');
  return promptList ? JSON.parse(promptList) : [];
}
