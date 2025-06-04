document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const processPageButton = document.getElementById('processPage');
  const statusDiv = document.getElementById('status');

  // Load saved API key when popup opens
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      statusDiv.textContent = 'API Key loaded.';
    } else {
      statusDiv.textContent = 'API Key not set.';
    }
    setTimeout(() => { if (statusDiv.textContent === 'API Key loaded.' || statusDiv.textContent === 'API Key not set.') statusDiv.textContent = ''; }, 2000);
  });

  saveKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ 'geminiApiKey': apiKey }, () => {
        statusDiv.textContent = 'API Key saved!';
        console.log('API Key saved.');
        setTimeout(() => statusDiv.textContent = '', 2000);
      });
    } else {
      statusDiv.textContent = 'Please enter an API Key.';
    }
  });

  processPageButton.addEventListener('click', () => {
    statusDiv.textContent = 'Sending command to page...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "processPage" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Popup Error: Error sending message to content script: ', chrome.runtime.lastError.message);
            statusDiv.textContent = `Error: Could not communicate with page. Details: ${chrome.runtime.lastError.message}`;
            // This can happen if the content script isn't injected, page isn't a netacad page, or extension was reloaded.
          } else if (response) {
            if (response.success) {
              if (response.result === true) {
                statusDiv.textContent = 'Processing started on page.';
                 console.log('Popup: Processing started successfully on page.');
              } else if (response.result === false) {
                statusDiv.textContent = 'Processed: No questions found on page.';
                console.log('Popup: Page processed, but no questions were found.');
              } else {
                statusDiv.textContent = 'Page responded, but with an unexpected result from scrapeData.';
                console.warn('Popup: Received unexpected (but successful) response.result from content script:', response.result);
              }
            } else { // response.success is false
              statusDiv.textContent = `Error on page: ${response.error || 'Unknown error'}`;
              console.error('Popup: Received error response from content script:', response);
            }
          } else {
            // No response and no lastError usually means no content script called sendResponse successfully.
            // This implies no frame found app-root, or an issue in the responding frame prevented sendResponse.
            statusDiv.textContent = 'No response from page. Is it a NetAcad quiz page with questions?';
            console.warn('Popup: No affirmative response from any content script in the tab. Check if app-root exists in any frame.');
          }
          setTimeout(() => { if (statusDiv.textContent !== '') statusDiv.textContent = ''; }, 4000); 
        });
      } else {
        statusDiv.textContent = 'Error: Could not find active tab.';
        console.error('Popup Error: No active tab found to send message to.');
      }
    });
  });
}); 