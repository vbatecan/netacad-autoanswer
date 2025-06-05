# Collaboration Guide for NetAcad Scraper

Welcome! This document is for developers who want to contribute to the NetAcad Scraper browser extension.

## Project Structure
- `api.js` — Handles all communication with the Gemini AI API (single and batch answer requests).
- `scraper.js` — Scrapes questions and answers from the NetAcad DOM, batches them, and coordinates UI updates.
- `ui.js` — Manages the UI for each question, including answer display, refresh, and extraction helpers.
- `content.js` — Entry point for content scripts; sets up mutation observers, message listeners, and orchestrates scraping.
- `popup.js` — Handles the extension popup UI and communication with content scripts.
- `manifest.json` — Chrome extension manifest (MV3).
- `README.md` — Project overview and user instructions.
- `COLLABORATION.md` — (This file) Developer/contributor guide.

## Getting Started
1. **Clone the repository**
2. **Install dependencies** (if any; currently, all code is vanilla JS)
3. **Load the extension in Chrome**:
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the project folder
4. **Get a Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey) and set it in the extension popup
5. **Open a NetAcad quiz page** and use the extension

## Coding Conventions
- Use **ES6+ JavaScript** (let/const, arrow functions, template literals, etc.)
- Use `console.debug` for most logs, `console.warn`/`console.error` for warnings/errors
- Keep comments concise and relevant; remove outdated or obvious comments
- Prefer modular, single-responsibility functions
- Use descriptive variable and function names
- Keep UI code and scraping logic separated

## Testing Changes
- Test on real NetAcad quiz pages (with dynamic navigation, iframes, etc.)
- Check both single and batch answer flows
- Test with and without an API key
- Try edge cases: no questions, malformed DOM, missing elements
- Use the popup to trigger manual scrapes and check auto-detection
- Check the console for errors and excessive logs

## Proposing Changes
- Fork the repo and create a feature branch
- Make your changes with clear, atomic commits
- Test thoroughly before submitting a PR
- Open a Pull Request (PR) with a clear description of your changes and why they're needed
- For bugs or feature requests, open an Issue first if unsure

## Adding New Question Types or Improving Detection
- Add new extraction logic to `scraper.js` and/or `ui.js` as needed
- Update the batching logic in `scraper.js` and the prompt in `api.js` to support new types
- Add UI display logic for new answer formats in `ui.js`
- Test with real examples and document any new selectors or patterns
- Update the README and this file if the workflow changes

## Communication
- Use GitHub Issues and PRs for all technical discussion
- For urgent or sensitive matters, contact the maintainer listed in the repo

Thank you for contributing to NetAcad Scraper! 