const NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function getAiAnswer(question, answers, apiKey) {
  if (!apiKey) {
    console.error("Error: NVIDIA API Key not provided to getAiAnswer.");
    return "Error: NVIDIA API Key not available. Please set it in the extension popup.";
  }

  let prompt = `Given the following multiple-choice question and its possible answers, please choose the best answer(s).
If the question implies multiple correct answers (e.g., 'select all that apply', 'choose N correct options'), return ALL chosen answer texts, each on a new line.
Otherwise, if it's a single-choice question, return only the text of the single best chosen answer option.
Do not add any extra explanation or leading text like "The best answer is: ".

Question:
${question}

Possible Answers:
`;
  answers.forEach((ans, i) => {
    prompt += `${i + 1}. ${ans}\n`;
  });

  const body = {
    model: NVIDIA_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: { "enable_thinking": true }
  };

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getAiAnswerBackground", url: API_URL, apiKey, body },
        (res) => resolve(res)
      );
    });

    if (response.error) {
      console.error("NVIDIA API Error via Background:", response.error, response.details);
      return response.error;
    }

    const data = response.data;
    if (
      data.choices &&
      data.choices.length > 0 &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      return data.choices[0].message.content.trim();
    } else {
      console.error("Unexpected response structure from NVIDIA API:", data);
      return "Error: Could not extract answer from NVIDIA response structure.";
    }
  } catch (error) {
    console.error("Error communicating with background script for AI:", error);
    return "Error: Internal extension communication failure.";
  }
}

async function getAiAnswersForBatch(questionsDataArray, apiKey) {
  if (!apiKey) {
    console.error(
      "Error: NVIDIA API Key not provided to getAiAnswersForBatch.",
    );
    return {
      error:
        "Error: NVIDIA API Key not available. Please set it in the extension popup.",
    };
  }
  if (!questionsDataArray || questionsDataArray.length === 0) {
    console.debug("getAiAnswersForBatch: No questions provided.");
    return { answers: [] };
  }

  let prompt =
    "You will be provided with a JSON array of multiple-choice questions. For each question, choose the best answer(s) from its 'Possible Answers'.\n";
  prompt +=
    "If a question implies multiple correct answers (e.g., 'select all that apply', 'choose N correct options'), include all correct answer texts for that question concatenated into a single string, separated by ' /// ' (space, three forward slashes, space). Example: 'Answer A /// Answer C'.\n";
  prompt +=
    "Otherwise, if it's a single-choice question, return just the single best answer text as the string for that question.\n";
  prompt +=
    "Return a single JSON array of strings, where each string is the processed answer for the corresponding question in the input array. Do not add any extra explanation or leading/trailing text.\n";
  prompt +=
    'For example, if the input is two questions (Q1 single-choice, Q2 multi-choice requiring two answers), your output should be a JSON array like: ["Text of answer for Q1", "Text of answer A for Q2 /// Text of answer B for Q2"].\n\n';
  prompt += "Here are the questions:\n```json\n";

  const questionsForPrompt = questionsDataArray.map((q, index) => ({
    id: `question_${index + 1}`,
    question_text: q.question,
    possible_answers: q.answers,
  }));

  prompt += JSON.stringify(questionsForPrompt, null, 2);
  prompt += "\n```";

  const body = {
    model: NVIDIA_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: { "enable_thinking": true }
  };

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getAiAnswersForBatchBackground", url: API_URL, apiKey, body },
        (res) => resolve(res)
      );
    });

    if (response.error) {
      console.error("NVIDIA API Batch Error via Background:", response.error, response.details);
      return { error: response.error };
    }

    const data = response.data;

    if (
      data.choices &&
      data.choices.length > 0 &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      const rawResponseText = data.choices[0].message.content;
      console.debug("NVIDIA API Batch Raw Response Text:", rawResponseText);
      try {
        let parsedAnswers = JSON.parse(rawResponseText);
        
        // Handle case where AI might wrap the array in an object
        if (!Array.isArray(parsedAnswers) && typeof parsedAnswers === 'object') {
           const keys = Object.keys(parsedAnswers);
           if (keys.length === 1 && Array.isArray(parsedAnswers[keys[0]])) {
             parsedAnswers = parsedAnswers[keys[0]];
           }
        }

        if (
          Array.isArray(parsedAnswers) &&
          parsedAnswers.every((ans) => typeof ans === "string")
        ) {
          if (parsedAnswers.length === questionsDataArray.length) {
            return { answers: parsedAnswers };
          } else {
            console.error(
              "NVIDIA API Batch Error: Number of answers received does not match number of questions sent.",
              parsedAnswers,
            );
            return {
              error: "Error: Mismatch in number of answers from AI.",
              answers: parsedAnswers,
            };
          }
        } else {
          console.error(
            "NVIDIA API Batch Error: Response is not a JSON array of strings.",
            parsedAnswers,
          );
          return {
            error:
              "Error: AI response was not a valid JSON array of answer strings.",
          };
        }
      } catch (e) {
        console.error(
          "NVIDIA API Batch Error: Failed to parse AI response as JSON.",
          rawResponseText,
          e,
        );
        return {
          error:
            "Error: Could not parse AI response for batch. Raw: " +
            rawResponseText,
        };
      }
    } else {
      console.error(
        "Unexpected response structure from NVIDIA API for batch:",
        data,
      );
      return {
        error:
          "Error: Could not extract answers from NVIDIA batch response structure.",
      };
    }
  } catch (error) {
    console.error("Error communicating with background script for batch AI:", error);
    return { error: "Error: Internal extension communication failure." };
  }
}



