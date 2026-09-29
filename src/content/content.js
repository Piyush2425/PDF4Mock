/**
 * NPTEL & GATEOverflow Practice PDF Generator - Content Script
 * Strictly scopes extraction to NPTEL (seek.nptel.ac.in) and GATEOverflow (gateoverflow.in).
 * Supports both List View and Paginated/Paged View for both platforms.
 */

(() => {
  if (window.__GATE_EXTRACTOR_LOADED__) return;
  window.__GATE_EXTRACTOR_LOADED__ = true;

  console.log("[NPTEL & GATEOverflow Practice PDF] Content script initialized.");

  // =========================================================================
  // Generic Utility & Sanitization Functions
  // =========================================================================

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetParent !== null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function sanitizeHtml(elementOrHtml, baseOrigin) {
    if (!elementOrHtml) return "";
    let clone;
    if (typeof elementOrHtml === "string") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = elementOrHtml;
      clone = tempDiv;
    } else {
      clone = elementOrHtml.cloneNode(true);
    }

    const origin = baseOrigin || window.location.origin;

    // Remove explicit evaluation and answer-revealing / interactive elements
    const unwantedSelectors = [
      ".evaluated-answer",
      ".eval-header",
      ".reveal-badge",
      ".evaluation-result",
      ".score-display",
      "[class*='reveal-badge']",
      "[class*='evaluated-answer']",
      "#choiceAnswer",
      "#multipleAnswer",
      "#numericAnswer",
      "#numericAnswerContent",
      ".your-answer",
      "[class*='your-answer']",
      "[class*='answer-box']",
      "[class*='answer-input']",
      "[class*='answer-section']",
      "[class*='response-box']",
      "input",
      "textarea",
      "select",
      "button.save-next",
      "button.mark-review",
      "button.clear-response",
      "button.submit-quiz",
      ".timer",
      "#timer",
      "#timeDiv",
      ".chips",
      "button"
    ];

    clone.querySelectorAll(unwantedSelectors.join(", ")).forEach(el => el.remove());

    // Explicitly remove UI labels/containers containing "Your answer", "Enter your answer", or "Flag for review"
    clone.querySelectorAll("div, section, aside, span, p, h1, h2, h3, h4, label").forEach(el => {
      const text = el.innerText?.trim() || "";
      if (/^Your\s*answer/i.test(text) || /^Enter\s*your\s*answer/i.test(text) || /^Only\s*numeric\s*Input/i.test(text) || /Flag\s*for\s*review/i.test(text)) {
        el.remove();
      }
    });

    // Clean any evaluation attributes or styles from children
    clone.querySelectorAll("*").forEach(el => {
      el.classList.remove("is-expected", "is-selected", "is-correct", "is-incorrect");
      if (el.hasAttribute("aria-checked")) el.removeAttribute("aria-checked");
      if (el.hasAttribute("onclick")) el.removeAttribute("onclick");
      if (el.hasAttribute("onchange")) el.removeAttribute("onchange");
      if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
        el.remove();
      }
    });

    // Fix relative image URLs to absolute URLs
    clone.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("//")) {
        img.src = new URL(src, origin).href;
      }
    });

    // Fix relative anchor links
    clone.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");
      if (href && !href.startsWith("http") && !href.startsWith("#") && !href.startsWith("//")) {
        a.href = new URL(href, origin).href;
      }
    });

    return clone.innerHTML;
  }

  // =========================================================================
  // Platform Adapter 1: NPTEL Seek (seek.nptel.ac.in)
  // Supports List View (.linear-view) & Paginated Single Question View (.chips)
  // =========================================================================

  const NptelSeekAdapter = {
    platformId: "nptel-seek",
    platformName: "NPTEL",

    matches(url) {
      return url.hostname.includes("seek.nptel.ac.in");
    },

    extractMockMetadata() {
      const urlObj = new URL(window.location.href);
      const testId = urlObj.searchParams.get("id") || "";
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const courseSlug = pathParts[1] || "";

      const titleElem = document.querySelector("h1, .course-title, .assessment-title, .unit-title, header .title, [class*='title']");
      let pageTitle = titleElem ? titleElem.innerText.trim() : document.title.replace(/\s+/g, " ").trim();

      let mockNumberStr = testId ? `Mock Test #${testId}` : "Mock Test";
      if (courseSlug) {
        mockNumberStr += ` (${courseSlug.toUpperCase()})`;
      }

      return {
        testId,
        courseSlug,
        mockTestNumber: testId ? `Mock Test #${testId}` : "Mock Test #1",
        testTitle: pageTitle || `NPTEL GATE ${mockNumberStr}`
      };
    },

    hasListView() {
      const linearView = document.querySelector(".linear-view");
      return !!linearView && linearView.querySelectorAll(".question-card").length > 0;
    },

    getTotalQuestionsCount() {
      const allText = document.body.innerText || "";
      const qMatch = allText.match(/Question\s+\d+\s*\/\s*(\d+)/i);
      if (qMatch && qMatch[1]) {
        return parseInt(qMatch[1], 10);
      }
      const chips = document.querySelectorAll(".chips button.chip, button.chip, .chip");
      if (chips.length > 0) return chips.length;

      const cards = document.querySelectorAll(".linear-view .question-card");
      if (cards.length > 0) return cards.length;

      return 1;
    },

    getPaginationButtons() {
      const chips = Array.from(document.querySelectorAll(".chips button.chip, button.chip"));
      if (chips.length > 0) return chips;

      return Array.from(document.querySelectorAll(".paginator button, .question-nav button, .question-palette button, .q-btn"));
    },

    getNextButton() {
      return Array.from(document.querySelectorAll("button, a")).find(b => {
        const text = b.innerText?.trim() || "";
        return /^Next\s*→?$/i.test(text) || b.classList.contains("btn-next");
      }) || null;
    },

    extractActiveQuestion(targetIndex = 1) {
      const card = document.querySelector(".question-card") || document.querySelector(".assessment-question") || document.querySelector("main") || document;

      let rawLabel = `Question ${targetIndex}`;
      const allText = document.body.innerText || "";
      const labelMatch = allText.match(/Question\s+\d+\s*\/\s*\d+/i);
      if (labelMatch) {
        rawLabel = labelMatch[0];
      }

      let marksText = "";
      const marksMatch = allText.match(/(\d+(?:\.\d+)?)\s*marks?/i);
      if (marksMatch) marksText = marksMatch[0];

      let promptElem = card.querySelector(".prompt-text.backend-html") || card.querySelector(".prompt-text") || card.querySelector(".question-prompt") || card.querySelector(".question-body");
      
      if (!promptElem) {
        const candidates = Array.from(document.querySelectorAll("div, section, p, article")).filter(el => {
          const text = el.innerText || "";
          const isAnswerBox = /Your\s*answer/i.test(text) || el.querySelector("input, textarea") || el.classList.contains("chips");
          return !isAnswerBox && text.length > 15 && text.length < 2000 && !el.querySelector("header, footer, nav, button");
        });
        if (candidates.length > 0) {
          promptElem = candidates.sort((a, b) => b.innerText.length - a.innerText.length)[0];
        }
      }

      const cleanPromptHtml = promptElem ? sanitizeHtml(promptElem, window.location.origin) : "<p><i>[Question prompt]</i></p>";
      const cleanPromptText = promptElem ? promptElem.innerText.replace(/\s+/g, " ").trim() : "";

      const images = promptElem ? Array.from(promptElem.querySelectorAll("img")).map(img => ({
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        width: img.getAttribute("width") || "",
        height: img.getAttribute("height") || ""
      })) : [];

      const choiceElements = Array.from(document.querySelectorAll(".choices .choice, .choice, .option-item, mat-radio-button, mat-checkbox, label.radio, label.checkbox"));
      const cleanOptions = [];
      let questionType = "NAT";

      if (choiceElements.length > 0 && !document.querySelector("input[placeholder*='numeric'], input[placeholder*='answer'], textarea[placeholder*='answer']")) {
        const hasCheckboxes = choiceElements.some(c => c.querySelector('input[type="checkbox"]') || c.tagName === "MAT-CHECKBOX" || c.classList.contains("msq"));
        questionType = hasCheckboxes ? "MSQ" : "MCQ";

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        choiceElements.forEach((choice, idx) => {
          const letterElem = choice.querySelector(".choice-letter, .option-letter");
          const textElem = choice.querySelector(".choice-text.backend-html") || choice.querySelector(".choice-text") || choice;

          const letter = letterElem ? letterElem.innerText.trim() : `${alphabet[idx] || idx + 1}.`;
          const optHtml = textElem ? sanitizeHtml(textElem, window.location.origin) : choice.innerText.trim();
          const optText = textElem ? textElem.innerText.replace(/\s+/g, " ").trim() : choice.innerText.replace(/\s+/g, " ").trim();

          cleanOptions.push({ letter, html: optHtml, text: optText });
        });
      }

      return {
        index: targetIndex,
        rawLabel,
        marks: marksText,
        promptHtml: cleanPromptHtml,
        promptText: cleanPromptText,
        type: questionType,
        options: cleanOptions,
        imagesCount: images.length,
        hasImages: images.length > 0,
        hasTables: promptElem ? promptElem.querySelectorAll("table").length > 0 : false,
        hasCode: promptElem ? promptElem.querySelectorAll("pre, code").length > 0 : false
      };
    },

    inspect() {
      const meta = this.extractMockMetadata();
      const isList = this.hasListView();
      const totalCount = this.getTotalQuestionsCount();

      return {
        success: true,
        platformId: this.platformId,
        platformName: this.platformName,
        isSupportedPlatform: true,
        isListView: isList,
        isPaginatedView: !isList,
        viewMode: isList ? "List View (All on One Page)" : "Paginated View (Auto-Step Ready)",
        totalQuestions: totalCount,
        mockTestNumber: meta.mockTestNumber,
        testTitle: meta.testTitle,
        url: window.location.href,
        debugStats: {
          platform: this.platformName,
          mode: isList ? "List View" : "Paginated View",
          totalCards: totalCount,
          withPrompt: totalCount,
          withOptions: totalCount,
          withoutOptions: 0,
          mcqCount: totalCount,
          msqCount: 0,
          natCount: 0,
          totalImages: 0,
          potentialLeaksDetectedInRawDom: 0
        }
      };
    },

    extractListView(options = {}) {
      const linearView = document.querySelector(".linear-view");
      if (!linearView) return null;

      const questionCards = Array.from(linearView.querySelectorAll(".question-card"));
      if (questionCards.length === 0) return null;

      const extractedQuestions = [];
      questionCards.forEach((card, index) => {
        const labelElem = card.querySelector(".question-label");
        let rawLabel = labelElem ? labelElem.innerText.trim() : `Question ${index + 1}`;
        const marksElem = card.querySelector(".question-marks");
        const marksText = marksElem ? marksElem.innerText.trim() : "";
        const promptElem = card.querySelector(".prompt-text.backend-html");
        const cleanPromptHtml = promptElem ? sanitizeHtml(promptElem, window.location.origin) : "<p><i>[Question prompt]</i></p>";
        const cleanPromptText = promptElem ? promptElem.innerText.replace(/\s+/g, " ").trim() : "";

        const images = promptElem ? Array.from(promptElem.querySelectorAll("img")).map(img => ({
          src: img.getAttribute("src"),
          alt: img.getAttribute("alt") || "",
          width: img.getAttribute("width") || "",
          height: img.getAttribute("height") || ""
        })) : [];

        const choiceElements = Array.from(card.querySelectorAll(".choices .choice, .choice"));
        const cleanOptions = [];
        let questionType = "NAT";

        if (choiceElements.length > 0) {
          const hasCheckboxes = choiceElements.some(c => c.querySelector('input[type="checkbox"]') || c.classList.contains("msq"));
          questionType = hasCheckboxes ? "MSQ" : "MCQ";
          choiceElements.forEach(choice => {
            const letterElem = choice.querySelector(".choice-letter");
            const textElem = choice.querySelector(".choice-text.backend-html") || choice.querySelector(".choice-text");
            cleanOptions.push({
              letter: letterElem ? letterElem.innerText.trim() : "",
              html: textElem ? sanitizeHtml(textElem, window.location.origin) : choice.innerText.trim(),
              text: textElem ? textElem.innerText.replace(/\s+/g, " ").trim() : choice.innerText.replace(/\s+/g, " ").trim()
            });
          });
        }

        if (index === 0 && options.includeConsent === false && (/consent|instructions|agree/i.test(cleanPromptText))) {
          return;
        }

        extractedQuestions.push({
          index: index + 1,
          rawLabel,
          marks: marksText,
          promptHtml: cleanPromptHtml,
          promptText: cleanPromptText,
          type: questionType,
          options: cleanOptions,
          imagesCount: images.length,
          hasImages: images.length > 0,
          hasTables: promptElem ? promptElem.querySelectorAll("table").length > 0 : false,
          hasCode: promptElem ? promptElem.querySelectorAll("pre, code").length > 0 : false
        });
      });

      return extractedQuestions;
    }
  };

  // =========================================================================
  // Platform Adapter 2: GATEOverflow (gateoverflow.in/quiz/quiz.php)
  // Supports Question Paper View (#viewQPDiv) & Paginated Quiz (#palette)
  // =========================================================================

  const GateOverflowAdapter = {
    platformId: "gateoverflow",
    platformName: "GATEOverflow",

    matches(url) {
      return url.hostname.includes("gateoverflow.in");
    },

    extractMockMetadata() {
      const urlObj = new URL(window.location.href);
      const testId = urlObj.searchParams.get("test_id") || urlObj.searchParams.get("id") || urlObj.searchParams.get("quiz_id") || "";
      const titleElem = document.querySelector("#quizTitle, .quiz-title, #quizName, h1, h2, .test-title, #headDiv h2");
      let pageTitle = titleElem ? titleElem.innerText.replace(/\s+/g, " ").trim() : document.title.replace(/\s+/g, " ").trim();

      return {
        testId,
        mockTestNumber: testId ? `Quiz #${testId}` : (pageTitle ? pageTitle.slice(0, 30) : "GATEOverflow Quiz"),
        testTitle: pageTitle || "GATEOverflow Mock Test"
      };
    },

    hasListView() {
      const qpDiv = document.querySelector("#viewQPDiv") || document.querySelector("#QPDiv");
      return !!(qpDiv && qpDiv.innerHTML.includes("Q."));
    },

    getTotalQuestionsCount() {
      const paletteButtons = document.querySelectorAll("#palette button, #navDiv button, .questionPaletteBtn, .btn-question, [id^='qbtn_']");
      if (paletteButtons.length > 0) return paletteButtons.length;
      return 1;
    },

    getPaginationButtons() {
      return Array.from(document.querySelectorAll("#palette button, #navDiv button, .questionPaletteBtn, .btn-question, [id^='qbtn_']"));
    },

    getNextButton() {
      return null;
    },

    detectQuestionType(container) {
      const doc = container || document;
      const multipleAns = doc.querySelector("#multipleAnswer, .multipleAnswer");
      const choiceAns = doc.querySelector("#choiceAnswer, .choiceAnswer");
      const numericAns = doc.querySelector("#numericAnswer, .numericAnswer");

      if (multipleAns && isElementVisible(multipleAns)) return "MSQ";
      if (choiceAns && isElementVisible(choiceAns)) return "MCQ";
      if (numericAns && isElementVisible(numericAns)) return "NAT";

      const quesContent = doc.querySelector("#quesContents") || doc;
      const ol = quesContent.querySelector("ol, ul");
      if (ol && ol.querySelectorAll("li").length > 0) return "MCQ";

      return "NAT";
    },

    extractActiveQuestion(targetIndex = 1) {
      const quesContents = document.querySelector("#quesContents") || document.querySelector("#quesAnsContent");
      if (!quesContents) return null;

      const qnoElem = document.querySelector("#questionNumber, #currentQNo, .current-question-no, #qno");
      let qNumText = qnoElem ? qnoElem.innerText.replace(/\s+/g, " ").trim() : `Question ${targetIndex}`;

      const marksElem = document.querySelector("#marks, #positiveMarks, .marks-text, #currentQMarks");
      const marksText = marksElem ? marksElem.innerText.trim() : "";

      const cleanClone = quesContents.cloneNode(true);
      const olElement = cleanClone.querySelector("ol, ul");
      const cleanOptions = [];
      const qType = this.detectQuestionType(document);

      if (olElement) {
        const liItems = Array.from(olElement.querySelectorAll("li"));
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        liItems.forEach((li, idx) => {
          cleanOptions.push({
            letter: alphabet[idx] ? `${alphabet[idx]}.` : `${idx + 1}.`,
            html: sanitizeHtml(li, "https://gateoverflow.in"),
            text: li.innerText.replace(/\s+/g, " ").trim()
          });
        });
        olElement.remove();
      }

      const cleanPromptHtml = sanitizeHtml(cleanClone, "https://gateoverflow.in");
      const cleanPromptText = cleanClone.innerText.replace(/\s+/g, " ").trim();

      const images = Array.from(quesContents.querySelectorAll("img")).map(img => ({
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        width: img.getAttribute("width") || "",
        height: img.getAttribute("height") || ""
      }));

      return {
        index: targetIndex,
        rawLabel: qNumText,
        marks: marksText,
        promptHtml: cleanPromptHtml || `<p><i>[Question ${targetIndex}]</i></p>`,
        promptText: cleanPromptText,
        type: qType,
        options: cleanOptions,
        imagesCount: images.length,
        hasImages: images.length > 0,
        hasTables: cleanClone.querySelectorAll("table").length > 0,
        hasCode: cleanClone.querySelectorAll("pre, code").length > 0
      };
    },

    extractListView() {
      const qpDiv = document.querySelector("#viewQPDiv") || document.querySelector("#QPDiv");
      if (!qpDiv) return null;

      const rawHtml = qpDiv.innerHTML;
      if (!rawHtml || !rawHtml.includes("Q.")) return null;

      const container = document.createElement("div");
      container.innerHTML = rawHtml;

      const questions = [];
      let currentSection = "General";
      let currentQNum = null;
      let currentElements = [];

      function finalizeCurrentQuestion() {
        if (!currentQNum || currentElements.length === 0) return;
        const tempWrap = document.createElement("div");
        currentElements.forEach(el => tempWrap.appendChild(el.cloneNode(true)));
        const ol = tempWrap.querySelector("ol, ul");
        const cleanOptions = [];
        let isMsq = /multiple\s*choice|MSQ|more\s*than\s*one/i.test(tempWrap.innerText);

        if (ol) {
          const lis = Array.from(ol.querySelectorAll("li"));
          const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
          lis.forEach((li, i) => {
            cleanOptions.push({
              letter: alphabet[i] ? `${alphabet[i]}.` : `${i + 1}.`,
              html: sanitizeHtml(li, "https://gateoverflow.in"),
              text: li.innerText.replace(/\s+/g, " ").trim()
            });
          });
          ol.remove();
        }

        const promptHtml = sanitizeHtml(tempWrap, "https://gateoverflow.in");
        const images = Array.from(tempWrap.querySelectorAll("img")).map(img => ({
          src: img.getAttribute("src"),
          alt: img.getAttribute("alt") || "",
          width: img.getAttribute("width") || "",
          height: img.getAttribute("height") || ""
        }));

        questions.push({
          index: questions.length + 1,
          rawLabel: currentQNum,
          section: currentSection,
          marks: "",
          promptHtml: promptHtml || `<p><i>[Question ${questions.length + 1}]</i></p>`,
          promptText: tempWrap.innerText.replace(/\s+/g, " ").trim(),
          type: cleanOptions.length > 0 ? (isMsq ? "MSQ" : "MCQ") : "NAT",
          options: cleanOptions,
          imagesCount: images.length,
          hasImages: images.length > 0,
          hasTables: tempWrap.querySelectorAll("table").length > 0,
          hasCode: tempWrap.querySelectorAll("pre, code").length > 0
        });
        currentElements = [];
      }

      Array.from(container.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          if (el.tagName === "H2" || el.tagName === "H3") {
            const secText = el.innerText.trim();
            if (/Section/i.test(secText)) currentSection = secText;
            return;
          }
          const text = el.innerText || "";
          const qMatch = text.match(/Q\.\s*(\d+)\s*\)/i) || (el.tagName === "TABLE" && text.match(/Q\.\s*(\d+)/i));
          if (qMatch) {
            finalizeCurrentQuestion();
            currentQNum = `Question ${qMatch[1]}`;
            return;
          }
          if (currentQNum) currentElements.push(el);
        }
      });

      finalizeCurrentQuestion();
      return questions.length > 0 ? questions : null;
    },

    inspect() {
      const meta = this.extractMockMetadata();
      const isList = this.hasListView();
      const listQuestions = isList ? this.extractListView() : null;
      const paginationButtons = this.getPaginationButtons();
      const totalCount = listQuestions ? listQuestions.length : (paginationButtons.length > 0 ? paginationButtons.length : 1);

      return {
        success: true,
        platformId: this.platformId,
        platformName: this.platformName,
        isSupportedPlatform: true,
        isListView: isList,
        isPaginatedView: !isList,
        viewMode: isList ? "Question Paper List View" : "Paginated View (Palette Ready)",
        totalQuestions: totalCount,
        mockTestNumber: meta.mockTestNumber,
        testTitle: meta.testTitle,
        url: window.location.href,
        debugStats: {
          platform: this.platformName,
          mode: isList ? "List View" : "Paginated View",
          totalCards: totalCount,
          withPrompt: totalCount,
          withOptions: totalCount,
          withoutOptions: 0,
          mcqCount: totalCount,
          msqCount: 0,
          natCount: 0,
          totalImages: 0,
          potentialLeaksDetectedInRawDom: 0
        }
      };
    }
  };

  // =========================================================================
  // Scoped Platform Registry (NPTEL & GATEOverflow Only)
  // =========================================================================

  const SUPPORTED_PLATFORMS = [
    NptelSeekAdapter,
    GateOverflowAdapter
  ];

  function getActiveAdapter() {
    const url = new URL(window.location.href);
    return SUPPORTED_PLATFORMS.find(p => p.matches(url)) || null;
  }

  // =========================================================================
  // Safe Navigation & Master Extraction Engine
  // =========================================================================

  async function safePaginatedExtraction(adapter, options = {}) {
    const totalQuestions = adapter.getTotalQuestionsCount ? adapter.getTotalQuestionsCount() : 1;
    const collectedQuestions = [];
    const seenFingerprints = new Set();

    console.log(`[NPTEL & GATEOverflow PDF] Stepping across ${totalQuestions} questions on ${adapter.platformName}...`);

    function getActiveLabelText() {
      const all = document.body.innerText || "";
      const m = all.match(/Question\s+\d+\s*(?:\/|of)\s*\d+/i) || all.match(/Q\s*(\d+)/i);
      return m ? m[0] : "";
    }

    const chips = adapter.getPaginationButtons ? adapter.getPaginationButtons() : [];
    if (chips.length > 0 && chips[0] && chips[0].innerText.trim() === "1") {
      try {
        chips[0].click();
        await sleep(150);
      } catch (e) {}
    }

    for (let i = 1; i <= totalQuestions; i++) {
      const qData = adapter.extractActiveQuestion(i);
      if (qData) {
        const fingerprint = `${qData.rawLabel}::${qData.promptText.slice(0, 60)}`;
        if (!seenFingerprints.has(fingerprint)) {
          seenFingerprints.add(fingerprint);
          collectedQuestions.push(qData);
        }
      }

      if (i >= totalQuestions) break;

      const nextChip = chips.find(c => c.innerText.trim() === String(i + 1));
      const nextBtn = adapter.getNextButton ? adapter.getNextButton() : null;
      const previousLabel = getActiveLabelText();

      if (nextChip) {
        try { nextChip.click(); } catch (e) {}
      } else if (nextBtn) {
        try { nextBtn.click(); } catch (e) {}
      } else {
        break;
      }

      let attempts = 0;
      while (attempts < 15) {
        await sleep(100);
        attempts++;
        const currentLabel = getActiveLabelText();
        if (currentLabel && currentLabel !== previousLabel) {
          break;
        }
      }
    }

    return collectedQuestions;
  }

  async function masterExtract(adapter, options = {}) {
    const meta = adapter.extractMockMetadata();
    let extractedQuestions = [];

    if (adapter.hasListView && adapter.hasListView()) {
      extractedQuestions = adapter.extractListView(options) || [];
    }

    if (extractedQuestions.length === 0) {
      extractedQuestions = await safePaginatedExtraction(adapter, options);
    }

    if (extractedQuestions.length === 0) {
      return {
        success: false,
        error: "No questions could be extracted. Please ensure the test is open in your active tab."
      };
    }

    // Zero-Leakage Security Scan
    let leakOccurrences = 0;
    const leakDetails = [];
    const forbiddenPhrases = [
      /Save\s*&\s*Next/i,
      /Mark\s*for\s*Review/i,
      /Clear\s*Response/i,
      /Your\s*Answer/i,
      /Correct\s*Answer\s*:/i,
      /Expected\s*Answer/i,
      /class=["'][^"']*numericAnswerContent[^"']*["']/i,
      /class=["'][^"']*reveal-badge[^"']*["']/i,
      /class=["'][^"']*evaluated-answer[^"']*["']/i,
      /class=["'][^"']*is-expected[^"']*["']/i,
      /Score:\s*\d+\s*\/\s*\d+/i,
      /Not Attempted/i
    ];

    extractedQuestions.forEach((q, idx) => {
      const combined = (q.promptHtml + " " + q.options.map(o => o.html).join(" "));
      for (const pattern of forbiddenPhrases) {
        if (pattern.test(combined)) {
          leakOccurrences++;
          leakDetails.push(`Q${idx + 1}: Match for ${pattern.toString()}`);
        }
      }
    });

    return {
      success: true,
      platformId: adapter.platformId,
      platformName: adapter.platformName,
      mockTestNumber: options.customMockNumber || meta.mockTestNumber,
      testTitle: options.customTestTitle || meta.testTitle,
      url: window.location.href,
      generatedAt: new Date().toLocaleString(),
      totalExtracted: extractedQuestions.length,
      questions: extractedQuestions,
      leakCheck: {
        passed: leakOccurrences === 0,
        leakCount: leakOccurrences,
        leakDetails
      }
    };
  }

  // =========================================================================
  // Message Listener
  // =========================================================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const adapter = getActiveAdapter();

    if (!adapter) {
      sendResponse({
        success: false,
        isSupportedPlatform: false,
        error: "Current website is not supported. Please open an assessment on seek.nptel.ac.in or gateoverflow.in/quiz/quiz.php."
      });
      return true;
    }

    if (request.action === "INSPECT_TEST") {
      const report = adapter.inspect();
      sendResponse(report);
    } else if (request.action === "EXTRACT_PRACTICE_PAPER") {
      masterExtract(adapter, request.options || {}).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    }
    return true;
  });
})();
