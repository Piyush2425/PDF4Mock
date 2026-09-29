# Contributing to GATE Practice PDF Generator

Thank you for your interest in contributing to this open-source project! Our mission is to help GATE aspirants and students convert online mock tests into clean, printable practice papers with zero answer leakage.

---

## 🚀 How to Add a New Platform Adapter

Adding a new platform (e.g. Made Easy, Ace Academy, Testbook, etc.) is easy!

1. Open `src/content/content.js`.
2. Create a new Platform Adapter object:

```javascript
const YourPlatformAdapter = {
  platformId: "your-platform",
  platformName: "Your Platform Name",

  matches(url) {
    return url.hostname.includes("yourplatform.com");
  },

  extractMockMetadata() {
    return {
      mockTestNumber: "Mock Test #1",
      testTitle: document.title
    };
  },

  hasListView() {
    // Return true if all questions are rendered on 1 page
    return !!document.querySelector(".all-questions-container");
  },

  getTotalQuestionsCount() {
    return document.querySelectorAll(".question-item").length || 65;
  },

  getPaginationButtons() {
    // Return question palette buttons if in paginated mode
    return Array.from(document.querySelectorAll(".palette button"));
  },

  getNextButton() {
    return document.querySelector("button.next");
  },

  extractActiveQuestion(index) {
    return {
      index,
      rawLabel: `Question ${index}`,
      marks: "1 Mark",
      promptHtml: "<p>Question text...</p>",
      promptText: "Question text...",
      type: "MCQ", // "MCQ" | "MSQ" | "NAT"
      options: [
        { letter: "A.", html: "Option 1", text: "Option 1" },
        { letter: "B.", html: "Option 2", text: "Option 2" }
      ],
      imagesCount: 0,
      hasImages: false,
      hasTables: false,
      hasCode: false
    };
  }
};
```

3. Add your adapter to the `SPECIFIC_PLATFORMS` array in `src/content/content.js`.
4. Test it on your browser and submit a Pull Request!

---

## 🛡️ Core Rules for Contributors

1. **Strictly Read-Only**: The extension must NEVER modify answers, select radio buttons/checkboxes, or trigger test submissions.
2. **Zero Answer Leakage**: All evaluation badges, scores, and correct answer indicators must be safely stripped.
3. **No External Backends**: 100% of the extraction and PDF preparation must execute locally in the user's browser for privacy and security.
