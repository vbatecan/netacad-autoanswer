chrome.commands.onCommand.addListener((command) => {
  if (command === "process-page-command") {
    console.log("Command received: process-page-command");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.storage.sync.get(["showAnswers"], (result) => {
          let showAnswers = true;
          if (typeof result.showAnswers === "boolean") {
            showAnswers = result.showAnswers;
          }

          chrome.tabs.sendMessage(
            tabId,
            { action: "processPage", showAnswers: showAnswers },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Background Error: Could not send message to tab.",
                  chrome.runtime.lastError.message,
                );
              } else {
                console.log(
                  "Background: Message sent to tab, response:",
                  response,
                );
              }
            },
          );
        });
      } else {
        console.warn("Background: No active tab found.");
      }
    });
  }
});

// Relay AI requests to bypass CSP restrictions on content pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAiAnswerBackground" || request.action === "getAiAnswersForBatchBackground") {
    const { url, apiKey, body } = request;
    
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        sendResponse({ error: `NVIDIA API Error: ${response.status} ${response.statusText}`, details: data });
      } else {
        sendResponse({ data: data });
      }
    })
    .catch((error) => {
      console.error("Background Fetch Error:", error);
      sendResponse({ error: "Error connecting to NVIDIA API. This may be a network issue or API downtime.", details: error.message });
    });
    
    return true; // Keep message channel open for async response
  }
});
