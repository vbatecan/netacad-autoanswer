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
