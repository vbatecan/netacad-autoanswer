console.log("NetAcad Scraper content script loaded and ready.");

// Functions getAiAnswer, processSingleQuestion, and scrapeData are now in separate files (api.js, ui.js, scraper.js)
// and are expected to be loaded into the same execution context.

let debounceTimeout;
function debouncedScrape() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (typeof window.scrapeData === 'function') {
            console.log('NetAcad Scraper: Mutation detected, re-initiating scrape...');
            window.scrapeData(); // Calls scrapeData with currentAttempt = 1 by default
        } else {
            console.error("NetAcad Scraper: window.scrapeData not found for debounced call.");
        }
    }, 1200); // Debounce delay of 1.2 seconds (adjust as needed)
}

function initMutationObserver() {
    console.log("NetAcad Scraper: Attempting to initialize MutationObserver.");
    const appRoot = document.querySelector("app-root");
    if (appRoot && appRoot.shadowRoot) {
        const pageView = appRoot.shadowRoot.querySelector("page-view");
        if (pageView && pageView.shadowRoot) {
            const targetNode = pageView.shadowRoot;
            const observerConfig = { childList: true, subtree: true };
            
            const observer = new MutationObserver((mutationsList, observer) => {
                // For now, any change in the observed subtree triggers a re-scrape.
                // More sophisticated filtering of mutationsList could be added if needed.
                console.log("NetAcad Scraper: MutationObserver detected DOM change in page-view's shadowRoot.");
                debouncedScrape();
            });

            observer.observe(targetNode, observerConfig);
            console.log("NetAcad Scraper: MutationObserver initialized and observing page-view's shadowRoot.");
        } else {
            console.warn("NetAcad Scraper: MutationObserver setup failed - page-view or its shadowRoot not found. Observer will not be active.");
        }
    } else {
        console.warn("NetAcad Scraper: MutationObserver setup failed - app-root or its shadowRoot not found. Observer will not be active.");
    }
}

// Ensure scrapeData (from scraper.js) is available on the window object
// for callbacks from setTimeout within scrapeData itself and for autoRunScraper.
if (typeof window.scrapeData !== "function") {
    // This relies on scraper.js being loaded and scrapeData being defined in the global scope.
    // If scrapeData is not yet defined (e.g. script loading order), this might assign undefined.
    // A more robust solution for extensions (MV3) would use modules or a different script injection strategy.
    // For now, we assume scraper.js has loaded and defined scrapeData globally.
    if (typeof scrapeData === "function") {
        window.scrapeData = scrapeData;
    } else {
        console.error("scrapeData function not found in global scope. scraper.js might not have loaded correctly or before this script.");
    }
}


// Optional: Automatically run scrapeData if an API key is already set on page load for NetAcad pages.
const autoRunScraper = async () => {
  // First, check if we are likely in the correct frame (the one with app-root)
  if (!document.querySelector("app-root")) {
    const frameContext = window.top === window ? "main page" : "an iframe";
    console.log(
      `NetAcad Scraper: autoRunScraper - app-root not found in this frame context (${frameContext}). Auto-run aborted.`
    );
    return; // Do not proceed if app-root is not in this document context
  }

  // Wait for the full page to load, including scripts that might add <app-root>
  if (document.readyState !== "complete") {
    await new Promise((resolve) =>
      window.addEventListener("load", resolve, { once: true })
    );
  }
  // Add a small additional delay just in case, as onload doesn't always guarantee custom elements are fully ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  const storedData = await chrome.storage.sync.get(["geminiApiKey"]);
  if (storedData.geminiApiKey) {
    console.log(
      "NetAcad Scraper: API key found. Attempting initial scrape and setting up observer."
    );
    if (typeof window.scrapeData === "function") {
      await window.scrapeData(); // Perform initial scrape
      initMutationObserver();   // Setup observer after initial scrape attempt
    } else {
      console.error(
        "NetAcad Scraper: Critical - window.scrapeData not defined for auto-run and observer setup."
      );
    }
  } else {
    console.log(
      "NetAcad Scraper: Page loaded. No API key. Observer not set. Use popup to set key and process."
    );
  }
};

autoRunScraper();

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processPage") {
    console.log("NetAcad Scraper (content.js): Received processPage message from popup.");
    // Check if this frame contains the app-root element
    if (document.querySelector("app-root")) {
      console.log("NetAcad Scraper (content.js): app-root found in this frame. Calling window.scrapeData().");
      if (typeof window.scrapeData === 'function') {
        // scrapeData is async and returns true/false
        window.scrapeData().then(result => {
          console.log(`NetAcad Scraper (content.js): scrapeData completed in this frame with result: ${result}`);
          sendResponse({ success: true, result: result });
        }).catch(error => {
          console.error("NetAcad Scraper (content.js): Error calling scrapeData from message listener:", error);
          sendResponse({ success: false, error: error.toString() });
        });
        return true; // Indicates that sendResponse will be called asynchronously
      } else {
        console.error("NetAcad Scraper (content.js): window.scrapeData not found in this frame for processPage message.");
        sendResponse({ success: false, error: "scrapeData_not_found_in_frame" });
      }
    } else {
      // If app-root is not in this frame, do not respond or send a specific message if needed for debugging.
      // The popup will handle the case where no frame responds affirmatively.
      console.log("NetAcad Scraper (content.js): app-root NOT found in this frame. Ignoring processPage message.");
      // Optionally, send a negative response to help popup identify if ANY frame responded.
      // However, it's cleaner if only the successful frame responds positively.
      // sendResponse({ success: false, error: "app_root_not_in_this_frame" }); 
      // To avoid multiple negative responses flooding the popup, we'll let the popup timeout or handle no positive response.
      return false; // No asynchronous response from this specific frame if app-root is not found.
    }
  }
  // Handle other messages if any
  return false; // Default for synchronous messages or if this listener doesn't handle the message type
});


// Periodic log (enabled by user)
setInterval(() => {
  console.log(
    "NetAcad Scraper content script is active - periodic check @ " +
      new Date().toLocaleTimeString()
  );
}, 15000);
