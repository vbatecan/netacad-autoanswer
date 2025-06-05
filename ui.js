function createAiAssistantUI(uiContainerId, index) {
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
  aiAnswerDisplay.textContent = "Initializing...";
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

  return { uiContainer, aiAnswerDisplay, refreshButton };
}

function extractQuestionAndAnswers(mcqViewElement, index) {
  let questionText = "Question text not found";
  let answerElements = [];
  let questionTextElement = null;

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
          questionText = questionTextElement.innerText.trim();
        } else {
          const potentialElements = Array.from(
            baseView.shadowRoot.querySelectorAll("div, p, span")
          );
          for (const el of potentialElements) {
            const text = el.innerText.trim();
            if (text.length > 20) {
              questionText = text;
              questionTextElement = el;
              console.debug(
                `NetAcad UI: Used generic text search in base-view for question ${
                  index + 1
                }: ${questionText}. Element: <${el.tagName}>`
              );
              break;
            }
          }
          if (!questionTextElement) {
            console.warn(
              `NetAcad UI: Question text element not found via specific or generic selectors in base-view for mcq ${
                index + 1
              }.`
            );
          }
        }
      } else {
        let directQuestionEl = mcqViewElement.shadowRoot.querySelector(
          "div.component__body-inner.mcq__body-inner"
        );
        if (!directQuestionEl) {
          directQuestionEl =
            mcqViewElement.shadowRoot.querySelector(".mcq__prompt");
        }
        if (!directQuestionEl) {
          directQuestionEl = mcqViewElement.shadowRoot.querySelector(".prompt");
        }

        if (directQuestionEl) {
          questionTextElement = directQuestionEl;
          questionText = directQuestionEl.innerText.trim();
        } else {
          const potentialElements = Array.from(
            mcqViewElement.shadowRoot.querySelectorAll("div, p, span")
          );
          for (const el of potentialElements) {
            const text = el.innerText.trim();
            if (text.length > 20) {
              questionText = text;
              questionTextElement = el;
              console.debug(
                `NetAcad UI: Used generic text search directly in mcq-view shadowRoot for question ${
                  index + 1
                }: ${questionText}. Element: <${el.tagName}>`
              );
              break;
            }
          }
          if (!questionTextElement) {
            console.warn(
              `NetAcad UI: Question text element not found in mcq ${
                index + 1
              } (no base-view or text not in mcq-view shadowRoot directly).`
            );
          }
        }
      }
      answerElements = mcqViewElement.shadowRoot.querySelectorAll(
        ".mcq__item-label.js-item-label"
      );
    } else {
      console.warn(
        `NetAcad UI: MCQ View element or its shadowRoot is missing for question ${
          index + 1
        }`
      );
      questionText = "Error: MCQ View element not accessible.";
    }
  } catch (e) {
    console.error(
      `NetAcad UI: Error extracting Q&A for question ${index + 1}:`,
      e,
      mcqViewElement
    );
    questionText = `Error extracting data. Check console.`;
  }
  return { questionText, answerElements, questionTextElement };
}

function processAnswerElements(answerElements, index) {
  let answerTexts = [];
  if (answerElements.length > 0) {
    console.debug("NetAcad UI: Possible Answers:");
    answerElements.forEach((answer, answerIndex) => {
      const ansText = answer.innerText.trim();
      answerTexts.push(ansText);
      console.debug(`NetAcad UI:   ${answerIndex + 1}: ${ansText}`);
    });
  } else {
    console.debug(`NetAcad UI: No answer elements found for question ${index + 1}.`);
  }
  return answerTexts;
}

function updateUiAndLogsPostExtraction(aiAnswerDisplay, questionText, answerTexts, index) {
  console.debug(`NetAcad UI: --- Question ${index + 1} --- Details --- `);
  console.debug("NetAcad UI: Question:", questionText);
  console.debug("NetAcad UI: Answers Extracted:", answerTexts);

  if (answerTexts.length === 0) {
    if (
      questionText !== "Question text not found" &&
      !questionText.startsWith("Error:")
    ) {
      aiAnswerDisplay.textContent =
        "AI Assistant: Question found, but no answer options detected.";
    } else {
      aiAnswerDisplay.textContent = questionText; // Show the extraction error
    }
  }

  if (
    questionText.startsWith("Error:") ||
    questionText === "Question text not found"
  ) {
    aiAnswerDisplay.textContent = questionText;
  }
}

function injectUi(uiContainer, questionTextElement, mcqViewElement, uiContainerId, index) {
  let uiInjected = false;
  if (questionTextElement && questionTextElement.parentNode) {
    try {
      const oldUiInPlace = questionTextElement.parentNode.querySelector(
        `#${uiContainerId}`
      );
      if (oldUiInPlace) {
        console.debug(
          `NetAcad UI: Injection (Q ${
            index + 1
          }): Removing existing UI (id: ${uiContainerId}) from questionTextElement's parent.`
        );
        oldUiInPlace.remove();
      }

      console.debug(
        `NetAcad UI: Injection (Q ${index + 1}): Preparing to inject. uiContainer.id: ${
          uiContainer.id
        }, uiContainer.outerHTML (brief): ${uiContainer.outerHTML.substring(
          0,
          100
        )}...`
      );
      console.debug(
        `NetAcad UI: Injection (Q ${index + 1}): questionTextElement is <${
          questionTextElement.tagName
        }>. Parent is <${questionTextElement.parentNode.tagName}>.`
      );

      questionTextElement.parentNode.insertBefore(
        uiContainer,
        questionTextElement.nextSibling
      );

      const injectedElementCheck = questionTextElement.parentNode.querySelector(
        `#${uiContainerId}`
      );
      if (injectedElementCheck) {
        console.debug(
          `NetAcad UI: Injection (Q ${
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
            console.debug(
              `NetAcad UI: Injection (Q ${
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
              } id="${rootNode.host.id}" class="${rootNode.host.className}">. Host visible: ${!!rootNode.host.offsetParent}.`;
            } else if (rootNode) {
              hostInfo = `Parent's rootNode is <${rootNode.nodeName}>.`;
            }
            console.debug(
              `NetAcad UI: Injection (Q ${
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
                `NetAcad UI: Injection (Q ${
                  index + 1
                }) DEFERRED CHECK: Original parent (questionTextElement.parentNode) is null. Cannot check further.`
              );
              return;
            }

            const stillInOriginalParentCheck = originalParent.querySelector(
              `#${uiContainerId}`
            );
            if (stillInOriginalParentCheck) {
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
              console.debug(
                `NetAcad UI: Injection (Q ${
                  index + 1
                }) DEFERRED CHECK - Original Parent Context: ${hostInfo}. Original Parent Tag: <${
                  originalParent.tagName
                }>. Original Parent Visible (offsetParent): ${!!originalParent.offsetParent}`
              );
            } else {
              console.error(
                `NetAcad UI: Injection (Q ${
                  index + 1
                }) DEFERRED CHECK: Element #${uiContainerId} NO LONGER in original parent NOR by document.getElementById. Likely removed or parent changed.`
              );
            }
          }
        }, 500);
      } else {
        console.error(
          `NetAcad UI: Injection (Q ${
            index + 1
          }): CRITICAL FAILURE - insertBefore called, but element #${uiContainerId} NOT FOUND in parent immediately after. Parent: <${
            questionTextElement.parentNode.tagName
          }>, questionTextElement: <${questionTextElement.tagName}>.`
        );
        uiInjected = false; // Explicitly set to false
      }
    } catch (e) {
      console.warn(
        `NetAcad UI: Injection (Q ${
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
    console.debug(
      `NetAcad UI: Injection (Q ${
        index + 1
      }): SKIPPED - questionTextElement (found: ${!!questionTextElement}) or its parentNode (parent exists: ${!!(
        questionTextElement && questionTextElement.parentNode
      )}) is missing.`
    );
  }

  if (!uiInjected && mcqViewElement && mcqViewElement.shadowRoot) {
    console.debug(
      `NetAcad UI: Injection (Q ${
        index + 1
      }): Attempting fallback to mcqViewElement.shadowRoot.`
    );
    mcqViewElement.shadowRoot.appendChild(uiContainer);
    console.debug(
      `NetAcad UI: Injection (Q ${
        index + 1
      }): SUCCESS - Injected into mcqViewElement.shadowRoot.`
    );
    uiInjected = true;
  } else if (!uiInjected) {
    console.debug(
      `NetAcad UI: Injection (Q ${
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
    console.debug(
      `NetAcad UI: Injection (Q ${
        index + 1
      }): Attempting fallback via hostElement. mcqViewElement present: ${!!mcqViewElement}, hostElement: ${
        hostElement ? `<${hostElement.tagName}>` : "null"
      }`
    );
    if (hostElement && hostElement.parentElement) {
      console.debug(
        `NetAcad UI: Injection (Q ${index + 1}): hostElement.parentElement: ${
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
        console.debug(
          `NetAcad UI: Injection (Q ${
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
        console.debug(
          `NetAcad UI: Injection (Q ${
            index + 1
          }): SUCCESS - Injected via hostElement.parentElement, before hostElement.nextSibling.`
        );
      } else {
        hostElement.parentElement.appendChild(uiContainer);
        console.debug(
          `NetAcad UI: Injection (Q ${
            index + 1
          }): SUCCESS - Appended via hostElement.parentElement.`
        );
      }
      uiInjected = true;
    } else if (!uiInjected) {
      console.debug(
        `NetAcad UI: Injection (Q ${
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
        console.debug(
          `NetAcad UI: Injection (Q ${
            index + 1
          }): Removing existing UI (id: ${uiContainerId}) from document.body.`
        );
        existingUiInBody.remove();
      }

      console.warn(
        `NetAcad UI: Injection (Q ${
          index + 1
        }): CRITICAL FALLBACK - Appending to document.body.`
      );
      document.body.appendChild(uiContainer);
      uiInjected = true;
    }
  }
  return uiInjected;
}

function getFriendlyGeminiErrorMessage(errorString) {
  // Handles known Gemini API error patterns
  if (!errorString) return null;
  if (errorString.includes('503') && errorString.toLowerCase().includes('overload')) {
    return 'AI Suggestion: Gemini API is overloaded. Please try again later.';
  }
  if (errorString.includes('503') && errorString.toLowerCase().includes('unavailable')) {
    return 'AI Suggestion: Gemini API is currently unavailable (503). Please try again later.';
  }
  if (errorString.includes('quota')) {
    return 'AI Suggestion: Gemini API quota exceeded. Please check your API usage or try again later.';
  }
  if (errorString.includes('invalid') && errorString.toLowerCase().includes('key')) {
    return 'AI Suggestion: Invalid Gemini API Key. Please check your key in the extension popup.';
  }
  // Add more patterns as needed
  return null;
}

async function handleRefreshAction(questionText, answerTexts, apiKey, aiAnswerDisplay, index) {
  if (!aiAnswerDisplay) return;

  if (!apiKey) {
    aiAnswerDisplay.textContent =
      "API Key not set. Please set it in the extension popup.";
    console.warn(`NetAcad UI: refreshAction for Q${index + 1}: API Key not available.`);
    return;
  }

  if (
    questionText === "Question text not found" ||
    questionText.startsWith("Error:")
  ) {
    aiAnswerDisplay.textContent = questionText; // Reshow extraction error
    console.warn(
      `NetAcad UI: refreshAction for Q${
        index + 1
      }: Aborted due to question extraction issue: ${questionText}`
    );
    return;
  }
  if (answerTexts.length === 0) {
    aiAnswerDisplay.textContent =
      "AI Assistant: No answer options available to send to AI.";
    console.warn(
      `NetAcad UI: refreshAction for Q${index + 1}: Aborted, no answer texts.`
    );
    return;
  }

  aiAnswerDisplay.textContent = "Asking Gemini AI (single refresh)...";
  console.debug(
    `NetAcad UI: refreshAction for Q${
      index + 1
    }: Asking Gemini AI for question: "${questionText.substring(0, 50)}..."`
  );
  const rawAiResponse = await getAiAnswer(questionText, answerTexts, apiKey);

  console.debug(
    `NetAcad UI: AI Answer (single refresh) received for Q${index + 1}: '${rawAiResponse}' (Full text)`
  );

  if (rawAiResponse && rawAiResponse.trim() !== "" && !rawAiResponse.toLowerCase().startsWith("error:")) {
    const individualAnswers = rawAiResponse.split('\n').map(ans => ans.trim()).filter(ans => ans.length > 0);
    if (individualAnswers.length > 1) {
      aiAnswerDisplay.innerHTML = "AI Suggestions:<br />- " + individualAnswers.join("<br />- ");
      console.debug(`NetAcad UI: Q${index + 1} (single refresh) multiple answers:`, individualAnswers);
    } else if (individualAnswers.length === 1) {
      aiAnswerDisplay.textContent = `AI Suggestion: ${individualAnswers[0]}`;
      console.debug(`NetAcad UI: Q${index + 1} (single refresh) single answer: ${individualAnswers[0]}`);
    } else {
      aiAnswerDisplay.textContent = "AI Suggestion: No valid answer content received (single refresh).";
      console.warn(`NetAcad UI: Q${index + 1} (single refresh) AI response was empty or only whitespace after processing: '${rawAiResponse}'`);
    }
  } else if (rawAiResponse && rawAiResponse.toLowerCase().startsWith("error:")) {
    // Improved error handling
    const friendlyMsg = getFriendlyGeminiErrorMessage(rawAiResponse);
    if (friendlyMsg) {
      aiAnswerDisplay.textContent = friendlyMsg;
    } else {
      aiAnswerDisplay.textContent = rawAiResponse; // Display the error message directly
    }
    console.error(`NetAcad UI: Error displayed for Q${index + 1} (single refresh): ${rawAiResponse}`);
  } else {
    aiAnswerDisplay.textContent =
      "AI Suggestion: No answer received or answer was empty (single refresh).";
    console.warn(
      `NetAcad UI: AI returned empty or whitespace-only answer for Q${
        index + 1
      } (single refresh). Original response: '${rawAiResponse}'`
    );
  }
}

async function processSingleQuestion(mcqViewElement, index, apiKey, preFetchedAiAnswer = null) {
  const uiContainerId = `netacad-ai-q-${index}`;

  // Always attempt to remove old UI from mcqViewElement's shadowRoot first
  if (mcqViewElement && mcqViewElement.shadowRoot) {
    const existingUiInMcqSR = mcqViewElement.shadowRoot.querySelector(
      `#${uiContainerId}`
    );
    if (existingUiInMcqSR) {
      console.debug(
        `NetAcad UI: Removing existing UI (id: ${uiContainerId}) from mcqView SR for Q ${
          index + 1
        }`
      );
      existingUiInMcqSR.remove();
    }
  }
  // Note: Removal from questionTextElement.parentNode is handled during injection phase

  const { uiContainer, aiAnswerDisplay, refreshButton } = createAiAssistantUI(uiContainerId, index);

  // --- 2. Extract Question and Answers ---
  let { questionText, answerElements, questionTextElement } = extractQuestionAndAnswers(mcqViewElement, index);
  
  // --- 3. Process Answer Elements & Update UI based on extraction ---
  let answerTexts = processAnswerElements(answerElements, index);
  updateUiAndLogsPostExtraction(aiAnswerDisplay, questionText, answerTexts, index);

  // --- 4. UI Injection Logic ---
  injectUi(uiContainer, questionTextElement, mcqViewElement, uiContainerId, index);

  // --- 5. Refresh Action and Initial Fetch/Status ---
  refreshButton.addEventListener("click", () => 
    handleRefreshAction(questionText, answerTexts, apiKey, aiAnswerDisplay, index)
  );

  // Handle AI answer display (pre-fetched or initial call)
  if (preFetchedAiAnswer === "BATCH_PROCESSING_STARTED") {
    aiAnswerDisplay.textContent = "Batch processing... Please wait.";
    console.debug(`NetAcad UI: Q${index + 1} waiting for batched AI answer.`);
  } else if (preFetchedAiAnswer) { // An actual answer or error string is provided
    if (preFetchedAiAnswer.toLowerCase().startsWith("error:")) {
      // Improved error handling
      const friendlyMsg = getFriendlyGeminiErrorMessage(preFetchedAiAnswer);
      if (friendlyMsg) {
        aiAnswerDisplay.textContent = friendlyMsg;
      } else {
        aiAnswerDisplay.textContent = preFetchedAiAnswer;
      }
      console.error(`NetAcad UI: Error displayed for Q${index + 1} from pre-fetched data: ${preFetchedAiAnswer}`);
    } else {
      const multiAnswerSeparator = " /// ";
      if (preFetchedAiAnswer.includes(multiAnswerSeparator)) {
        const individualAnswers = preFetchedAiAnswer.split(multiAnswerSeparator).map(ans => ans.trim()).filter(ans => ans.length > 0);
        if (individualAnswers.length > 0) {
          aiAnswerDisplay.innerHTML = "AI Suggestions:<br />- " + individualAnswers.join("<br />- ");
        } else {
           aiAnswerDisplay.textContent = "AI Suggestion: Received multiple answer format but no valid content.";
        }
      } else {
        aiAnswerDisplay.textContent = `AI Suggestion: ${preFetchedAiAnswer}`;
      }
    }
  } else { // No pre-fetched answer, proceed with individual fetch if Q/A is valid
    if (
      questionText !== "Question text not found" &&
      !questionText.startsWith("Error:") &&
      answerTexts.length > 0 &&
      apiKey // Only try if API key is present
    ) {
      console.debug(`NetAcad UI: Q${index + 1} making individual call to AI (no pre-fetched answer).`);
      await handleRefreshAction(questionText, answerTexts, apiKey, aiAnswerDisplay, index);
    } else if (!apiKey && questionText !== "Question text not found" && !questionText.startsWith("Error:") && answerTexts.length > 0) {
      aiAnswerDisplay.textContent = "Error: Gemini API Key not set in popup.";
      console.warn(`NetAcad UI: Q${index + 1} cannot fetch AI answer - API key missing.`);
    } else {
      console.debug(`NetAcad UI: Q${index + 1} - Initial AI call skipped due to extraction issues or missing API key. Message: ${aiAnswerDisplay.textContent}`);
    }
  }
}