// Constants for retry mechanism
const MAX_SCRAPE_ATTEMPTS = 10; // Increased from 5
const SCRAPE_RETRY_DELAY_MS = 1500; // Increased from 1000

async function scrapeData(currentAttempt = 1) {
  // Check if we are in the correct frame (the one with app-root)
  if (!document.querySelector("app-root") && currentAttempt === 1) {
    const frameContext = window.top === window ? "main page" : "an iframe";
    console.log(
      `scrapeData: app-root not found in this frame context (${frameContext}). This script instance will not scrape. This is expected for the main page or irrelevant iframes.`
    );
    return false; // Do not proceed if app-root is not in this document context
  }
  // If on a retry attempt, and app-root is still not there, the existing retry logic will handle it.

  console.log(
    `NetAcad Scraper: scrapeData attempt #${currentAttempt} of ${MAX_SCRAPE_ATTEMPTS}`
  );

  const storedData = await chrome.storage.sync.get(["geminiApiKey"]);
  const apiKey = storedData.geminiApiKey;

  let mcqViewElements = [];
  let earlyExitReason = ""; // To store a more specific reason if traversal fails early

  try {
    console.log(`Attempt ${currentAttempt}: Checking for app-root...`);
    const appRoot = document.querySelector("app-root");
    if (appRoot && appRoot.shadowRoot) {
      console.log(
        `Attempt ${currentAttempt}: app-root found, checking for page-view...`
      );
      const pageView = appRoot.shadowRoot.querySelector("page-view");
      if (pageView && pageView.shadowRoot) {
        console.log(
          `Attempt ${currentAttempt}: page-view found, checking for article-view(s)...`
        );
        const articleViews =
          pageView.shadowRoot.querySelectorAll("article-view");
        if (articleViews && articleViews.length > 0) {
          console.log(
            `Attempt ${currentAttempt}: Found ${articleViews.length} article-view(s). Processing each...`
          );
          articleViews.forEach((articleView, i) => {
            if (articleView.shadowRoot) {
              // console.log(`Attempt ${currentAttempt}: Processing article-view #${i + 1}, checking for block-views...`); // Can be verbose
              const blockViews =
                articleView.shadowRoot.querySelectorAll("block-view");
              if (blockViews.length > 0) {
                blockViews.forEach((blockView, j) => {
                  if (blockView.shadowRoot) {
                    const mcqView =
                      blockView.shadowRoot.querySelector("mcq-view");
                    if (mcqView) {
                      console.log(
                        `Attempt ${currentAttempt}: mcq-view found in block-view #${
                          j + 1
                        } of article-view #${i + 1}`
                      ); // Can be verbose
                      mcqViewElements.push(mcqView);
                    } else {
                      console.log(
                        `Attempt ${currentAttempt}: No mcq-view in block-view #${
                          j + 1
                        } of article-view #${i + 1}`
                      ); // Can be verbose
                    }
                  } else {
                    console.log(
                      `Attempt ${currentAttempt}: block-view #${
                        j + 1
                      } in article-view #${i + 1} has no shadowRoot.`
                    ); // Can be verbose
                  }
                });
              } else {
                console.log(
                  `Attempt ${currentAttempt}: No block-views found in article-view #${
                    i + 1
                  }`
                ); // Can be verbose
              }
            } else {
              console.log(
                `Attempt ${currentAttempt}: article-view #${
                  i + 1
                } was found, but it has no shadowRoot.`
              );
              // earlyExitReason might be too broad if only one of many articleViews fails here
            }
          });
          if (mcqViewElements.length === 0 && articleViews.length > 0) {
            // This means we iterated through articleViews but found no mcqViews within them.
            earlyExitReason =
              "Found article-view(s) but no mcq-view elements within their valid shadow DOM structures.";
            console.log(`Attempt ${currentAttempt}: ${earlyExitReason}`);
          }
        } else {
          earlyExitReason =
            "page-view found, but no article-view elements within its shadowRoot.";
          console.log(`Attempt ${currentAttempt}: ${earlyExitReason}`);
        }
      } else {
        if (!pageView)
          earlyExitReason =
            "app-root found, but page-view not found within its shadowRoot.";
        else earlyExitReason = "page-view found, but it has no shadowRoot.";
        console.log(`Attempt ${currentAttempt}: ${earlyExitReason}`);
      }
    } else {
      if (!appRoot) earlyExitReason = "app-root not found in the document.";
      else earlyExitReason = "app-root found, but it has no shadowRoot.";
      console.log(`Attempt ${currentAttempt}: ${earlyExitReason}`);
    }
  } catch (e) {
    earlyExitReason = "Exception during shadow DOM traversal.";
    console.error(`Attempt ${currentAttempt}: ${earlyExitReason}`, e);
  }

  // Clear previous UI elements on the first attempt
  if (currentAttempt === 1) {
    // Clear UI from main document (fallbacks)
    document
      .querySelectorAll(".netacad-ai-assistant-ui[id^='netacad-ai-q-']")
      .forEach((el) => el.remove());

    // Clear UI from previously found mcqViewElements' shadow DOMs (if any were processed before a retry)
    // This is tricky as mcqViewElements are found fresh each time.
    // The simplest is that processSingleQuestion always creates new UI.
    // If an old UI was there from a previous call to processSingleQuestion *within the same scrapeData session*
    // (which doesn't happen due to fresh creation), it would be an issue.
    // The current model is: each processSingleQuestion for an mcqView appends a *new* UI.
    // If scrapeData is called again, it should clean up.
    // Let's ensure mcqViewElements (if found) have their potential old UIs cleaned *before* processing.
    mcqViewElements.forEach((mcqView) => {
      if (mcqView && mcqView.shadowRoot) {
        mcqView.shadowRoot
          .querySelectorAll(".netacad-ai-assistant-ui[id^='netacad-ai-q-']")
          .forEach((el) => el.remove());
      }
    });
  }

  if (!apiKey && currentAttempt === 1) {
    // Show API key warning only once per scrape session
    console.warn(
      "Gemini API Key not found in storage. Please set it in the extension popup."
    );
  }

  if (mcqViewElements.length === 0) {
    let logMessage = `Attempt #${currentAttempt}: No mcq-view elements found.`;
    if (earlyExitReason) {
      logMessage += ` Reason: ${earlyExitReason}`;
    } else if (currentAttempt === 1) {
      // If no earlyExitReason and it's the first attempt, it implies full traversal but no mcq-views.
      // For subsequent attempts, earlyExitReason should ideally be set if elements are missing.
      logMessage += ` Shadow DOM traversal completed as expected, but no mcq-view tags were identified.`;
    }
    console.log(logMessage);

    if (currentAttempt < MAX_SCRAPE_ATTEMPTS) {
      console.log(
        `Will retry in ${SCRAPE_RETRY_DELAY_MS / 1000}s... (Attempt ${
          currentAttempt + 1
        } of ${MAX_SCRAPE_ATTEMPTS})`
      );
      // Ensure window.scrapeData is available for setTimeout context
      setTimeout(() => {
        if (typeof window.scrapeData === "function") {
          window.scrapeData(currentAttempt + 1);
        } else {
          console.error(
            "window.scrapeData not found for retry, cannot continue."
          );
        }
      }, SCRAPE_RETRY_DELAY_MS);
      return false; // Indicate no questions found yet, but retrying
    }
    console.log(
      `Max retry attempts (${MAX_SCRAPE_ATTEMPTS}) reached. Failed to find mcq-view elements. Last known reason: ${
        earlyExitReason ||
        "mcq-view tags not identified after full traversal on final attempt"
      }`
    );
    return false; // Indicate no questions found after retries
  }

  console.log(
    `Found ${mcqViewElements.length} mcq-view element(s) on attempt #${currentAttempt}. Attempting to process...`
  );

  for (const [index, mcqViewElement] of mcqViewElements.entries()) {
    await processSingleQuestion(mcqViewElement, index, apiKey);
  }
  return true; // Indicate processing happened
} 