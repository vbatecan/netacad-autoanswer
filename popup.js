document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveKeyButton = document.getElementById("saveKey");
  const processPageButton = document.getElementById("processPage");
  const statusDiv = document.getElementById("status");
  const showAnswersToggle = document.getElementById("showAnswersToggle");
  const processOnSwitchToggle = document.getElementById(
    "processOnSwitchToggle",
  );

  chrome.storage.sync.get(
    ["geminiApiKey", "showAnswers", "processOnSwitch"],
    (result) => {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        statusDiv.textContent = "API Key loaded.";
      } else {
        statusDiv.textContent = "API Key not set.";
      }
      if (typeof result.showAnswers === "boolean") {
        showAnswersToggle.checked = result.showAnswers;
      } else {
        showAnswersToggle.checked = true;
      }

      if (typeof result.processOnSwitch === "boolean") {
        processOnSwitchToggle.checked = result.processOnSwitch;
      } else {
        processOnSwitchToggle.checked = true;
      }
      setTimeout(() => {
        if (
          statusDiv.textContent === "API Key loaded." ||
          statusDiv.textContent === "API Key not set."
        )
          statusDiv.textContent = "";
      }, 2000);
    },
  );

  showAnswersToggle.addEventListener("change", () => {
    chrome.storage.sync.set({ showAnswers: showAnswersToggle.checked });
  });

  processOnSwitchToggle.addEventListener("change", () => {
    chrome.storage.sync.set({ processOnSwitch: processOnSwitchToggle.checked });
  });

  saveKeyButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        statusDiv.textContent = "API Key saved!";
        console.debug("API Key saved.");
        setTimeout(() => (statusDiv.textContent = ""), 2000);
      });
    } else {
      statusDiv.textContent = "Please enter an API Key.";
    }
  });

  processPageButton.addEventListener("click", () => {
    statusDiv.textContent = "Sending command to page...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(
          tabId,
          { action: "processPage", showAnswers: showAnswersToggle.checked },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Popup Error: Error sending message to content script: ",
                chrome.runtime.lastError.message,
              );
              statusDiv.textContent = `Error: Could not communicate with page. Details: ${chrome.runtime.lastError.message}`;
            } else if (response) {
              if (response.success) {
                if (response.result === true) {
                  statusDiv.textContent = "Processing started on page.";
                  console.debug(
                    "Popup: Processing started successfully on page.",
                  );
                } else if (response.result === false) {
                  statusDiv.textContent =
                    "Processed: No questions found on page or Show Answers is disabled.";
                  console.debug(
                    "Popup: Page processed, but no questions were found.",
                  );
                } else {
                  statusDiv.textContent =
                    "Page responded, but with an unexpected result from scrapeData.";
                  console.warn(
                    "Popup: Received unexpected (but successful) response.result from content script:",
                    response.result,
                  );
                }
              } else {
                statusDiv.textContent = `Error on page: ${response.error || "Unknown error"}`;
                console.error(
                  "Popup: Received error response from content script:",
                  response,
                );
              }
            } else {
              statusDiv.textContent =
                "No response from page. Is it a NetAcad quiz page with questions?";
              console.warn(
                "Popup: No affirmative response from any content script in the tab. Check if app-root exists in any frame.",
              );
            }
            setTimeout(() => {
              if (statusDiv.textContent !== "") statusDiv.textContent = "";
            }, 4000);
          },
        );
      } else {
        statusDiv.textContent = "Error: Could not find active tab.";
        console.error("Popup Error: No active tab found to send message to.");
      }
    });
  });
});
