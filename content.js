console.log("NetAcad Scraper content script loaded and ready.");

// Functions getAiAnswer, processSingleQuestion, and scrapeData are now in separate files (api.js, ui.js, scraper.js)
// and are expected to be loaded into the same execution context.

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
      `autoRunScraper: app-root not found in this frame context (${frameContext}). Auto-run aborted for this instance. This is expected for the main page or irrelevant iframes.`
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
      "API key found and page loaded. Attempting to process questions."
    );
    if (typeof window.scrapeData === "function") {
      window.scrapeData(); // Initial call, retries are handled within scrapeData
    } else {
      console.error(
        "Critical: window.scrapeData not defined even after explicit assignment for auto-run."
      );
    }
  } else {
    console.log(
      "Page loaded. No API key in storage. Use extension popup to set key and process."
    );
  }
};

autoRunScraper();

// Periodic log (enabled by user)
setInterval(() => {
  console.log(
    "NetAcad Scraper content script is active - periodic check @ " +
      new Date().toLocaleTimeString()
  );
}, 15000);
