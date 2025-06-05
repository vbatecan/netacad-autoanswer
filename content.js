console.log("NetAcad Scraper content script loaded and ready.");

let debounceTimeout;
// If the dynamic pages changes, reinitiate the scrape and wait for n amount of time to let it load first.
function debouncedScrape() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    if (typeof window.scrapeData === "function") {
      console.debug(
        "NetAcad Scraper: Mutation detected, re-initiating scrape..."
      );
      window.scrapeData();
    } else {
      console.error(
        "NetAcad Scraper: window.scrapeData not found for debounced call."
      );
    }
  }, 1200);
}

// Mutation Observer to detect changes in the DOM and reinitiate the scrape. Good for dynamic pages.
function initMutationObserver() {
  console.debug("NetAcad Scraper: Attempting to initialize MutationObserver.");
  const appRoot = document.querySelector("app-root");
  if (appRoot && appRoot.shadowRoot) {
    const pageView = appRoot.shadowRoot.querySelector("page-view");
    if (pageView && pageView.shadowRoot) {
      const targetNode = pageView.shadowRoot;
      const observerConfig = { childList: true, subtree: true };

      const observer = new MutationObserver((mutationsList, observer) => {
        // More sophisticated filtering of mutationsList could be added if needed.
        console.debug(
          "NetAcad Scraper: MutationObserver detected DOM change in page-view's shadowRoot."
        );
        debouncedScrape();
      });

      observer.observe(targetNode, observerConfig);
      console.debug(
        "NetAcad Scraper: MutationObserver initialized and observing page-view's shadowRoot."
      );
    } else {
      console.warn(
        "NetAcad Scraper: MutationObserver setup failed - page-view or its shadowRoot not found. Observer will not be active."
      );
    }
  } else {
      console.warn(
      "NetAcad Scraper: MutationObserver setup failed - app-root or its shadowRoot not found. Observer will not be active."
    );
  }
}

if (typeof window.scrapeData !== "function") {
  if (typeof scrapeData === "function") {
    window.scrapeData = scrapeData;
        } else {
          console.error(
      "scrapeData function not found in global scope. scraper.js might not have loaded correctly or before this script."
    );
  }
}

const autoRunScraper = async () => {
  if (!document.querySelector("app-root")) {
    const frameContext = window.top === window ? "main page" : "an iframe";
    console.debug(
      `NetAcad Scraper: autoRunScraper - app-root not found in this frame context (${frameContext}). Auto-run aborted.`
    );
    return;
  }

  // Wait for the full page to load, including scripts that might add <app-root>
  if (document.readyState !== "complete") {
    await new Promise((resolve) =>
      window.addEventListener("load", resolve, { once: true })
    );
  }
  // Add a small additional delay just in case, as onload doesn't always guarantee custom elements are fully ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  const storedData = await chrome.storage.sync.get(["geminiApiKey", "showAnswers"]);
  if (storedData.geminiApiKey && (typeof storedData.showAnswers === 'undefined' || storedData.showAnswers === true)) {
    console.debug(
      "NetAcad Scraper: API key found and showAnswers enabled. Attempting initial scrape and setting up observer."
    );
    if (typeof window.scrapeData === "function") {
      await window.scrapeData(); // Perform initial scrape
      initMutationObserver(); // Setup observer after initial scrape attempt
    } else {
      console.error(
        "NetAcad Scraper: Critical - window.scrapeData not defined for auto-run and observer setup."
      );
    }
  } else if (storedData.geminiApiKey && storedData.showAnswers === false) {
    console.debug(
      "NetAcad Scraper: showAnswers is disabled. Skipping initial scrape and observer."
    );
  } else {
    console.debug(
      "NetAcad Scraper: Page loaded. No API key. Observer not set. Use popup to set key and process."
    );
  }
};

autoRunScraper();

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processPage") {
    console.debug(
      "NetAcad Scraper (content.js): Received processPage message from popup."
    );
    // Check if this frame contains the app-root element
    if (document.querySelector("app-root")) {
      if (request.hasOwnProperty('showAnswers') && request.showAnswers === false) {
        console.debug("NetAcad Scraper (content.js): showAnswers is false, not scraping.");
        sendResponse({ success: true, result: false, message: 'AI answers are hidden by user setting.' });
        return false;
      }
      console.debug(
        "NetAcad Scraper (content.js): app-root found in this frame. Calling window.scrapeData()."
      );
      if (typeof window.scrapeData === "function") {
        window
          .scrapeData()
          .then((result) => {
            console.debug(
              `NetAcad Scraper (content.js): scrapeData completed in this frame with result: ${result}`
            );
            sendResponse({ success: true, result: result });
          })
          .catch((error) => {
            console.error(
              "NetAcad Scraper (content.js): Error calling scrapeData from message listener:",
              error
            );
            sendResponse({ success: false, error: error.toString() });
          });
        return true; // Indicates that sendResponse will be called asynchronously
      } else {
        console.error(
          "NetAcad Scraper (content.js): window.scrapeData not found in this frame for processPage message."
        );
        sendResponse({
          success: false,
          error: "scrapeData_not_found_in_frame",
        });
      }
    } else {
      console.debug(
        "NetAcad Scraper (content.js): app-root NOT found in this frame. Ignoring processPage message."
      );
      return false;
    }
  }
  return false;
});

// Periodic check to see if the content script is still active. Can be removed.
setInterval(() => {
  console.debug(
    "NetAcad Scraper content script is active - periodic check @ " +
      new Date().toLocaleTimeString()
  );
}, 30000);
