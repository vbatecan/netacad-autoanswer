console.log("NetAcad Scraper content script loaded and ready.");

async function getAiAnswer(question, answers, apiKey) {
  if (!apiKey) {
    // Removed direct check for placeholder
    console.error("Error: Gemini API Key not provided to getAiAnswer.");
    return "Error: Gemini API Key not available. Please set it in the extension popup.";
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let prompt = `Given the following multiple-choice question and its possible answers, please choose the best answer.
Only return the text of the chosen answer option. Do not add any extra explanation or leading text like "The best answer is: ".

Question:
${question}

Possible Answers:
`;
  answers.forEach((ans, i) => {
    prompt += `${i + 1}. ${ans}\n`;
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return `Error calling Gemini API: ${response.status} ${response.statusText}. Check console. Key might be invalid or quota exceeded.`;
    }

    const data = await response.json();
    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0
    ) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      console.error("Unexpected response structure from Gemini API:", data);
      return "Error: Could not extract answer from Gemini response structure.";
    }
  } catch (error) {
    console.error("Error fetching from Gemini API:", error);
    return "Error connecting to Gemini API. Check console for details.";
  }
}

async function processSingleQuestion(mcqViewElement, index, apiKey) {
  const uiContainerId = `netacad-ai-q-${index}`;
  let questionText = "Question text not found";
  let answerElements = [];
  let answerTexts = [];
  let questionTextElement = null; // To store the DOM element for question text
  let uiInjected = false;

  // --- 1. UI Element Creation ---
  // Attempt to remove from mcqViewElement.shadowRoot (common injection point)
  if (mcqViewElement && mcqViewElement.shadowRoot) {
    const existingUiInMcqSR = mcqViewElement.shadowRoot.querySelector(
      `#${uiContainerId}`
    );
    if (existingUiInMcqSR) {
      console.log(
        `Removing existing UI (id: ${uiContainerId}) from mcqView SR for Q ${
          index + 1
        }`
      );
      existingUiInMcqSR.remove();
    }
  }
  // Note: Removal from questionTextElement.parentNode is handled during injection phase

  const uiContainer = document.createElement("div");
  uiContainer.id = uiContainerId;
  uiContainer.className = "netacad-ai-assistant-ui";
  uiContainer.style.marginTop = "15px";
  uiContainer.style.padding = "10px";
  uiContainer.style.border = "1px solid #007bff";
  uiContainer.style.borderRadius = "5px";
  uiContainer.style.backgroundColor = "#e7f3ff";
  uiContainer.style.color = "#333";

  const titleElement = document.createElement("h5");
  titleElement.textContent = "AI Assistant";
  titleElement.style.marginTop = "0px";
  titleElement.style.marginBottom = "5px";
  titleElement.style.color = "#0056b3";
  uiContainer.appendChild(titleElement);

  const aiAnswerDisplay = document.createElement("p");
  aiAnswerDisplay.className = "ai-answer-display";
  aiAnswerDisplay.style.margin = "5px 0";
  aiAnswerDisplay.style.fontStyle = "italic";
  aiAnswerDisplay.textContent = "Processing question..."; // Initial status
  uiContainer.appendChild(aiAnswerDisplay);

  const refreshButton = document.createElement("button");
  refreshButton.className = "ai-refresh-button";
  refreshButton.textContent = "Refresh AI Answer";
  refreshButton.style.padding = "6px 12px";
  refreshButton.style.border = "none";
  refreshButton.style.borderRadius = "4px";
  refreshButton.style.backgroundColor = "#007bff";
  refreshButton.style.color = "white";
  refreshButton.style.cursor = "pointer";
  refreshButton.onmouseover = () =>
    (refreshButton.style.backgroundColor = "#0056b3");
  refreshButton.onmouseout = () =>
    (refreshButton.style.backgroundColor = "#007bff");
  uiContainer.appendChild(refreshButton);

  // --- 2. Try to Extract Question and Answers ---
  try {
    if (mcqViewElement && mcqViewElement.shadowRoot) {
      const baseView = mcqViewElement.shadowRoot.querySelector(
        'base-view[type="component"]'
      );
      if (baseView && baseView.shadowRoot) {
        questionTextElement = baseView.shadowRoot.querySelector(
          "div.component__body-inner.mcq__body-inner"
        );
        if (!questionTextElement) {
          questionTextElement =
            baseView.shadowRoot.querySelector(".mcq__prompt");
        }
        if (!questionTextElement) {
          questionTextElement = baseView.shadowRoot.querySelector(".prompt");
        }

        if (questionTextElement) {
          // If specific selector found an element
          questionText = questionTextElement.innerText.trim();
        } else {
          // Specific selectors for base-view didn't find questionTextElement
          const potentialElements = Array.from(
            baseView.shadowRoot.querySelectorAll("div, p, span")
          );
          for (const el of potentialElements) {
            const text = el.innerText.trim();
            if (text.length > 20) {
              // Heuristic for question-like text
              questionText = text;
              questionTextElement = el; // Capture the element
              console.log(
                `Used generic text search in base-view for question ${
                  index + 1
                }: ${questionText}. Element: <${el.tagName}>`
              );
              break;
            }
          }
          // If loop finishes and questionTextElement is still null, it means generic search also failed.
          if (!questionTextElement) {
            console.warn(
              `Question text element not found via specific or generic selectors in base-view for mcq ${
                index + 1
              }.`
            );
            // questionText would still be "Question text not found" (its initial value if never updated)
          }
        }
      } else {
        // Fallback: If no base-view, or base-view has no shadowRoot
        let directQuestionEl = mcqViewElement.shadowRoot.querySelector(
          "div.component__body-inner.mcq__body-inner"
        );
        if (!directQuestionEl) {
          directQuestionEl =
            mcqViewElement.shadowRoot.querySelector(".mcq__prompt");
        }
        // Add .prompt as a direct fallback too
        if (!directQuestionEl) {
          directQuestionEl = mcqViewElement.shadowRoot.querySelector(".prompt");
        }

        if (directQuestionEl) {
          // If a specific selector matched directly in mcq-view's shadowRoot
          questionTextElement = directQuestionEl;
          questionText = directQuestionEl.innerText.trim();
        } else {
          // Specific direct selectors for mcq-view's shadowRoot didn't find an element
          const potentialElements = Array.from(
            mcqViewElement.shadowRoot.querySelectorAll("div, p, span")
          );
          for (const el of potentialElements) {
            const text = el.innerText.trim();
            if (text.length > 20) {
              questionText = text;
              questionTextElement = el; // Capture the element
              console.log(
                `Used generic text search directly in mcq-view shadowRoot for question ${
                  index + 1
                }: ${questionText}. Element: <${el.tagName}>`
              );
              break;
            }
          }
          // If loop finishes and questionTextElement is still null (and wasn't set by prior specific searches)
          if (!questionTextElement) {
            console.warn(
              `Question text element not found in mcq ${
                index + 1
              } (no base-view or text not in mcq-view shadowRoot directly via specific or generic).`
            );
            // questionText remains "Question text not found"
          }
        }
      }
      answerElements = mcqViewElement.shadowRoot.querySelectorAll(
        ".mcq__item-label.js-item-label"
      );
    } else {
      console.warn(
        `MCQ View element or its shadowRoot is missing for question ${
          index + 1
        }`
      );
      questionText = "Error: MCQ View element not accessible.";
    }
  } catch (e) {
    console.error(
      `Error extracting Q&A for question ${index + 1}:`,
      e,
      mcqViewElement
    );
    questionText = `Error extracting data. Check console.`;
  }

  // --- 3. Update Console Logs & Populate answerTexts, Update UI based on extraction ---
  console.log(`
--- Question ${index + 1} ---`);
  console.log("Question:", questionText);

  if (answerElements.length > 0) {
    console.log("Possible Answers:");
    answerElements.forEach((answer, answerIndex) => {
      const ansText = answer.innerText.trim();
      answerTexts.push(ansText);
      console.log(`  ${answerIndex + 1}: ${ansText}`);
    });
  } else {
    console.log(`  No answer elements found for question ${index + 1}.`);
    if (
      questionText !== "Question text not found" &&
      !questionText.startsWith("Error:")
    ) {
      aiAnswerDisplay.textContent =
        "AI Assistant: Question found, but no answer options detected.";
    } else {
      aiAnswerDisplay.textContent = questionText; // Show the question extraction error or "not found"
    }
  }

  if (
    questionText.startsWith("Error:") ||
    questionText === "Question text not found"
  ) {
    aiAnswerDisplay.textContent = questionText;
  }

  // --- 4. UI Injection Logic ---
  if (questionTextElement && questionTextElement.parentNode) {
    try {
      const oldUiInPlace = questionTextElement.parentNode.querySelector(
        `#${uiContainerId}`
      );
      if (oldUiInPlace) {
        console.log(
          `UI Injection (Q ${
            index + 1
          }): Removing existing UI (id: ${uiContainerId}) from questionTextElement's parent.`
        );
        oldUiInPlace.remove();
      }

      console.log(
        `UI Injection (Q ${index + 1}): Preparing to inject. uiContainer.id: ${
          uiContainer.id
        }, uiContainer.outerHTML (brief): ${uiContainer.outerHTML.substring(
          0,
          100
        )}...`
      );
      console.log(
        `UI Injection (Q ${index + 1}): questionTextElement is <${
          questionTextElement.tagName
        }>. Parent is <${questionTextElement.parentNode.tagName}>.`
      );
      // console.log(`UI Injection (Q ${index + 1}): Parent outerHTML BEFORE injection (brief): ${questionTextElement.parentNode.outerHTML.substring(0, 300)}...`);

      questionTextElement.parentNode.insertBefore(
        uiContainer,
        questionTextElement.nextSibling
      );

      // console.log(`UI Injection (Q ${index + 1}): Parent outerHTML AFTER injection (brief): ${questionTextElement.parentNode.outerHTML.substring(0, 300)}...`);
      const injectedElementCheck = questionTextElement.parentNode.querySelector(
        `#${uiContainerId}`
      );
      if (injectedElementCheck) {
        console.log(
          `UI Injection (Q ${
            index + 1
          }): SUCCESS - Injected after questionTextElement. Element #${uiContainerId} FOUND in parent. Parent: <${
            questionTextElement.parentNode.tagName
          }>, questionTextElement: <${
            questionTextElement.tagName
          }>. Injected el: <${injectedElementCheck.tagName}>`
        );
        uiInjected = true;

        // Deferred check
        setTimeout(() => {
          const stillThereCheck = document.getElementById(uiContainerId); // Check globally as it might have been moved
          if (stillThereCheck) {
            console.log(
              `UI Injection (Q ${
                index + 1
              }) DEFERRED CHECK: Element #${uiContainerId} IS STILL in the DOM (document.getElementById). Visible: ${!!stillThereCheck.offsetParent}`
            );
            const parentNode = stillThereCheck.parentNode;
            const rootNode = parentNode ? parentNode.getRootNode() : null;
            let hostInfo =
              "Parent context unclear (element may have been moved).";
            if (rootNode && rootNode instanceof ShadowRoot) {
              hostInfo = `Parent is in a ShadowRoot. Host: <${
                rootNode.host.tagName
              } id="${rootNode.host.id}" class="${
                rootNode.host.className
              }">. Host visible: ${!!rootNode.host.offsetParent}.`;
            } else if (rootNode) {
              hostInfo = `Parent's rootNode is <${rootNode.nodeName}>.`;
            }
            console.log(
              `UI Injection (Q ${
                index + 1
              }) DEFERRED CHECK - Parent Context: ${hostInfo}. Parent Tag: ${
                parentNode ? `<${parentNode.tagName}>` : "N/A"
              }. Parent visible: ${!!(parentNode && parentNode.offsetParent)}`
            );
          } else {
            // If not found by document.getElementById, check the original parent
            const originalParent = questionTextElement
              ? questionTextElement.parentNode
              : null;
            if (!originalParent) {
              console.error(
                `UI Injection (Q ${
                  index + 1
                }) DEFERRED CHECK: Original parent (questionTextElement.parentNode) is null. Cannot check further.`
              );
              return;
            }

            const stillInOriginalParentCheck = originalParent.querySelector(
              `#${uiContainerId}`
            );
            if (stillInOriginalParentCheck) {
              console.warn(
                `UI Injection (Q ${
                  index + 1
                }) DEFERRED CHECK: Element #${uiContainerId} NOT FOUND by document.getElementById, but IS in original parent. UI Visible (offsetParent): ${!!stillInOriginalParentCheck.offsetParent}`
              );
              const rootNode = originalParent.getRootNode();
              let hostInfo =
                "Original parent is not in a Shadow DOM or getRootNode is document.";
              if (rootNode instanceof ShadowRoot) {
                hostInfo = `Original parent is in a ShadowRoot. Host: <${
                  rootNode.host.tagName
                } id="${rootNode.host.id}" class="${
                  rootNode.host.className
                }">. Host visible: ${!!rootNode.host.offsetParent}.`;
              } else if (rootNode === document) {
                hostInfo = "Original parent's rootNode is the main document.";
              } else {
                hostInfo = `Original parent's rootNode is of type ${
                  rootNode.nodeName || "unknown"
                }`;
              }
              console.log(
                `UI Injection (Q ${
                  index + 1
                }) DEFERRED CHECK - Original Parent Context: ${hostInfo}. Original Parent Tag: <${
                  originalParent.tagName
                }>. Original Parent Visible (offsetParent): ${!!originalParent.offsetParent}`
              );
            } else {
              console.error(
                `UI Injection (Q ${
                  index + 1
                }) DEFERRED CHECK: Element #${uiContainerId} NO LONGER in original parent NOR by document.getElementById. Likely removed or parent changed.`
              );
            }
          }
        }, 500);
      } else {
        console.error(
          `UI Injection (Q ${
            index + 1
          }): CRITICAL FAILURE - insertBefore called, but element #${uiContainerId} NOT FOUND in parent immediately after. Parent: <${
            questionTextElement.parentNode.tagName
          }>, questionTextElement: <${questionTextElement.tagName}>.`
        );
        uiInjected = false; // Explicitly set to false
      }
    } catch (e) {
      console.warn(
        `UI Injection (Q ${
          index + 1
        }): FAILED to inject after questionTextElement. Parent: ${
          questionTextElement.parentNode
            ? `<${questionTextElement.parentNode.tagName}>`
            : "null"
        }, questionTextElement: <${questionTextElement.tagName}>. Error:`,
        e
      );
    }
  } else {
    console.log(
      `UI Injection (Q ${
        index + 1
      }): SKIPPED - questionTextElement (found: ${!!questionTextElement}) or its parentNode (parent exists: ${!!(
        questionTextElement && questionTextElement.parentNode
      )}) is missing.`
    );
  }

  if (!uiInjected && mcqViewElement && mcqViewElement.shadowRoot) {
    // Cleanup already done at the start for mcqViewElement.shadowRoot (or should be, check logic)
    console.log(
      `UI Injection (Q ${
        index + 1
      }): Attempting fallback to mcqViewElement.shadowRoot.`
    );
    mcqViewElement.shadowRoot.appendChild(uiContainer);
    console.log(
      `UI Injection (Q ${
        index + 1
      }): SUCCESS - Injected into mcqViewElement.shadowRoot.`
    );
    uiInjected = true;
  } else if (!uiInjected) {
    console.log(
      `UI Injection (Q ${
        index + 1
      }): SKIPPED - mcqViewElement (found: ${!!mcqViewElement}) or its shadowRoot (shadowRoot exists: ${!!(
        mcqViewElement && mcqViewElement.shadowRoot
      )}) is missing for direct shadowRoot append.`
    );
  }

  if (!uiInjected) {
    const hostElement = mcqViewElement
      ? mcqViewElement.getRootNode().host
      : null;
    console.log(
      `UI Injection (Q ${
        index + 1
      }): Attempting fallback via hostElement. mcqViewElement present: ${!!mcqViewElement}, hostElement: ${
        hostElement ? `<${hostElement.tagName}>` : "null"
      }`
    );
    if (hostElement && hostElement.parentElement) {
      console.log(
        `UI Injection (Q ${index + 1}): hostElement.parentElement: ${
          hostElement.parentElement
            ? `<${hostElement.parentElement.tagName}>`
            : "null"
        }`
      );
      // Try to remove existing UI if it was placed here by ID
      const existingUiByHost = hostElement.parentElement.querySelector(
        `#${uiContainerId}`
      );
      if (
        existingUiByHost &&
        existingUiByHost.parentElement === hostElement.parentElement
      ) {
        console.log(
          `UI Injection (Q ${
            index + 1
          }): Removing existing UI (id: ${uiContainerId}) from hostElement.parentElement.`
        );
        existingUiByHost.remove();
      }

      if (hostElement.nextSibling) {
        hostElement.parentElement.insertBefore(
          uiContainer,
          hostElement.nextSibling
        );
        console.log(
          `UI Injection (Q ${
            index + 1
          }): SUCCESS - Injected via hostElement.parentElement, before hostElement.nextSibling.`
        );
      } else {
        hostElement.parentElement.appendChild(uiContainer);
        console.log(
          `UI Injection (Q ${
            index + 1
          }): SUCCESS - Appended via hostElement.parentElement.`
        );
      }
      uiInjected = true;
    } else if (!uiInjected) {
      // Only if hostElement logic didn't apply
      console.log(
        `UI Injection (Q ${
          index + 1
        }): SKIPPED - hostElement (found: ${!!hostElement}) or hostElement.parentElement (found: ${!!(
          hostElement && hostElement.parentElement
        )}) is missing.`
      );
      // Try to remove existing UI if it was placed here by ID
      const existingUiInBody = document.body.querySelector(`#${uiContainerId}`);
      if (
        existingUiInBody &&
        existingUiInBody.parentElement === document.body
      ) {
        console.log(
          `UI Injection (Q ${
            index + 1
          }): Removing existing UI (id: ${uiContainerId}) from document.body.`
        );
        existingUiInBody.remove();
      }

      console.warn(
        `UI Injection (Q ${
          index + 1
        }): CRITICAL FALLBACK - Appending to document.body.`
      );
      document.body.appendChild(uiContainer);
      uiInjected = true;
    }
  }

  // --- 5. Refresh Action and Initial Fetch/Status ---
  const refreshAction = async () => {
    if (!aiAnswerDisplay) return;

    if (!apiKey) {
      aiAnswerDisplay.textContent =
        "API Key not set. Please set it in the extension popup.";
      console.warn(`refreshAction for Q${index + 1}: API Key not available.`);
      return;
    }

    if (
      questionText === "Question text not found" ||
      questionText.startsWith("Error:")
    ) {
      aiAnswerDisplay.textContent = questionText; // Reshow extraction error
      console.warn(
        `refreshAction for Q${
          index + 1
        }: Aborted due to question extraction issue: ${questionText}`
      );
      return;
    }
    if (answerTexts.length === 0) {
      aiAnswerDisplay.textContent =
        "AI Assistant: No answer options available to send to AI.";
      console.warn(
        `refreshAction for Q${index + 1}: Aborted, no answer texts.`
      );
      return;
    }

    aiAnswerDisplay.textContent = "Asking Gemini AI...";
    console.log(
      `refreshAction for Q${
        index + 1
      }: Asking Gemini AI for question: "${questionText.substring(0, 50)}..."`
    );
    const newAiAnswer = await getAiAnswer(questionText, answerTexts, apiKey);

    console.log(
      `AI Answer received for Q${index + 1}: '${newAiAnswer}' (Full text)`
    );

    if (
      newAiAnswer &&
      newAiAnswer.trim() !== "" &&
      !newAiAnswer.toLowerCase().startsWith("error:")
    ) {
      aiAnswerDisplay.textContent = `AI Suggestion: ${newAiAnswer}`;
    } else if (newAiAnswer && newAiAnswer.toLowerCase().startsWith("error:")) {
      aiAnswerDisplay.textContent = newAiAnswer;
      console.error(`Error displayed for Q${index + 1}: ${newAiAnswer}`);
    } else {
      aiAnswerDisplay.textContent =
        "AI Suggestion: No answer received or answer was empty.";
      console.warn(
        `AI returned empty or whitespace-only answer for Q${
          index + 1
        }. Original response: '${newAiAnswer}'`
      );
    }
  };

  refreshButton.addEventListener("click", refreshAction);

  // Initial action:
  // If questionText is an error OR answerTexts is empty, the message is already set in aiAnswerDisplay.
  // Otherwise, trigger refreshAction for the initial fetch.
  if (
    questionText !== "Question text not found" &&
    !questionText.startsWith("Error:") &&
    answerTexts.length > 0
  ) {
    refreshAction(); // Initial fetch
  } else {
    // aiAnswerDisplay should already reflect the issue (e.g. "Question text not found", "No answer options detected.", or an error)
    // Optionally, disable refresh button if no valid Q/A to process
    // refreshButton.disabled = true;
    // refreshButton.style.backgroundColor = "#ccc";
    // refreshButton.style.cursor = "not-allowed";
    console.log(
      `Initial AI call skipped for Q ${index + 1} due to: ${
        aiAnswerDisplay.textContent
      }`
    );
  }
}

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

// Assign to window object so it can be called from executeScript and setTimeout
// Conditional assignment to prevent issues if script is somehow injected multiple times, though unlikely for content scripts.
if (typeof window.scrapeData !== "function") {
  window.scrapeData = scrapeData;
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
