![ccnap_resize](https://github.com/user-attachments/assets/0cb6200c-c304-42fa-ad0f-fa68fa0c4fac)

# NetAcad Scraper

NetAcad Scraper is a browser extension designed to assist users on Cisco NetAcad by automatically scraping quiz questions and suggesting answers using Google Gemini AI. It streamlines the process of answering dynamically loaded NetAcad quizzes, saving time and reducing manual effort.

## What Does It Do?
- **Scrapes** multiple-choice questions and answer options from NetAcad quiz pages (even when questions are loaded dynamically via AJAX or iframes).
- **Batches** all questions on a page and sends them in a single request to the Gemini AI API, reducing API usage and improving efficiency.
- **Displays** AI-suggested answers directly below each question, with support for both single-answer and multi-answer (checkbox/select-all) questions.
- **Allows** users to refresh the AI answer for any individual question.
- **Automatically detects** when new questions are loaded (e.g., when navigating between questions) and re-scrapes as needed.

This will allow you to:
- **Saves time:** No more copying and pasting questions into AI chatbots or searching for answers manually.
- **Reduces API costs:** By batching questions, it minimizes the number of requests to the Gemini API.
- **Works with dynamic content:** MutationObserver ensures the extension adapts to NetAcad's dynamic page loads and iframes.
- **User-friendly:** Clean UI, easy setup, and one-click operation.
> Disable this plugin if you don't want see the answer and answering the question on your own which is a good thing instead of using this tool.

## Technologies Used
- **JavaScript (ES6+)**
- **Chrome Extensions API (Manifest V3)**
- **Shadow DOM and MutationObserver** for monitoring changes from dynamic pages and scraping
- **Google Gemini AI API** for answer suggestions

## How to Install and Use
1. **Clone or Download** this repository.
2. **Get a Google Gemini API Key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and generate an API key.
3. **Load the Extension in Chrome:**
   - Go to `chrome://extensions/`.
   - Enable "Developer mode" (top right).
   - Click "Load unpacked" and select the project folder.
4. **Set Your API Key:**
   - Click the extension icon.
   - Enter your Gemini API key in the popup and click "Save API Key".
5. **Use on NetAcad:**
   - Navigate to a NetAcad quiz page.
   - Click the extension icon and press "Process Questions on this Page".
   - The extension will scrape all questions, send them to Gemini AI, and display suggested answers below each question.
   - You can also refresh the AI answer for any question individually.

## How It Works
- **Content Scripts:** Injected into all frames on NetAcad pages, they detect and scrape questions from the page (including inside iframes).
- **Batching:** All questions are sent in a single API call to Gemini, which returns a JSON array of answers. This reduces API usage and speeds up processing.
- **MutationObserver:** Watches for changes in the quiz area (e.g., when navigating to a new question) and automatically re-scrapes and updates answers.
- **Multi-Answer Support:** If a question requires multiple answers (e.g., checkboxes), the AI is instructed to return all correct answers, and the UI displays them as a list.
- **Manual Refresh:** Each question's UI includes a "Refresh AI Answer" button for on-demand, per-question AI calls.

## API Key & Privacy
- Your Gemini API key is stored locally in your browser's extension storage and is **never shared** with anyone except Google Gemini API.
- You can remove or change your API key at any time via the extension popup.

## Planned Improvements
- **Support for More Question Types:**
  - Add detection and AI support for fill-in-the-blank, drag-and-drop, matching, and other interactive or open-ended question formats.
  - Improve answer extraction and display for these new types.
- **Improved Question Auto-Detection:**
  - Make the question/answer scraping logic more robust to handle a wider variety of NetAcad layouts and future changes.
  - Expand compatibility to similar e-learning platforms with different DOM structures.
- **Smarter AI Prompts:**
  - Dynamically adjust prompts based on question type for better answer accuracy.
- **User Feedback and Customization:**
  - Allow users to report missed questions or suggest improvements directly from the extension.
- **Visiblity**
  - Gives the ability for the user to show or not show the answer.

## Examples
![Screenshot 2025-06-04 224057](https://github.com/user-attachments/assets/04809880-60f5-4e72-a66a-5412529b1d81)

![Screenshot 2025-06-04 224126](https://github.com/user-attachments/assets/53845149-6347-42cc-88c6-096f35fd7d88)


## Contributing
Pull requests and suggestions are welcome! Please open an issue or PR for bug fixes, improvements, or new features.

## License
MIT License. See [LICENSE](LICENSE) for details. 
