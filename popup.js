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
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            function: () => {
              if (typeof window.scrapeData === 'function') {
                // The executeScript API will await this promise and return its resolved value.
                return window.scrapeData(); 
              } else {
                console.error('window.scrapeData function not found in content script.');
                return 'scrapeData_not_found'; // Specific string to indicate function missing
              }
            }
          },
          (injectionResults) => {
            if (chrome.runtime.lastError) {
              console.error('Error executing script: ', chrome.runtime.lastError.message);
              statusDiv.textContent = `Scripting Error: ${chrome.runtime.lastError.message}`;
            } else if (injectionResults && injectionResults.length > 0) {
              const result = injectionResults[0].result;
              if (result === true) {
                statusDiv.textContent = 'Processing started on page.';
              } else if (result === false) {
                statusDiv.textContent = 'Processed: No questions found on page.';
              } else if (result === 'scrapeData_not_found') {
                statusDiv.textContent = 'Error: Core function not found on page. Try reloading page/extension.';
                console.error('Popup received: scrapeData_not_found');
              } else {
                statusDiv.textContent = 'Page responded, but with unexpected result.';
                console.log('Popup received unexpected injection result:', result);
              }
            } else {
              statusDiv.textContent = 'Command sent, but no clear response from page.';
              console.log('No injection results received.');
            }
            setTimeout(() => statusDiv.textContent = '', 4000);
          }
        );
      } else {
        statusDiv.textContent = 'Error: Could not find active tab.';
        console.error('No active tab found to execute script on.');
      }
    });
  });
}); 