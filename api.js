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