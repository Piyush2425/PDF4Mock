/**
 * GATE Practice PDF - Print Preview Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const paperMainTitle = document.getElementById("paperMainTitle");
  const paperMockNumber = document.getElementById("paperMockNumber");
  const paperSourcePlatform = document.getElementById("paperSourcePlatform");
  const paperTestTitle = document.getElementById("paperTestTitle");
  const paperQuestionCount = document.getElementById("paperQuestionCount");
  const previewBrandTitle = document.getElementById("previewBrandTitle");
  const footerPlatformText = document.getElementById("footerPlatformText");
  const questionsList = document.getElementById("questionsList");
  const workspaceSelect = document.getElementById("workspaceSelect");
  const fontSizeSelect = document.getElementById("fontSizeSelect");
  const btnPrint = document.getElementById("btnPrint");

  // Load extracted data from chrome.storage
  try {
    const data = await chrome.storage.local.get("nptel_practice_paper_data");
    const payload = data.nptel_practice_paper_data;

    if (!payload || !payload.questions || payload.questions.length === 0) {
      questionsList.innerHTML = `
        <div class="loading-state" style="color: #dc2626;">
          ⚠️ No extracted question data found. Please return to your mock test and click "Generate Practice Paper" in the extension popup.
        </div>
      `;
      return;
    }

    renderPaper(payload);
  } catch (err) {
    console.error("Failed to load paper data:", err);
    questionsList.innerHTML = `
      <div class="loading-state" style="color: #dc2626;">
        Error loading paper data: ${err.message}
      </div>
    `;
  }

  function renderPaper(data) {
    const platform = data.platformName || "GATE";
    document.title = `${data.mockTestNumber || "Mock Test"} - Practice Paper (${platform})`;

    // Populate header
    paperMainTitle.textContent = `${platform.toUpperCase()} PRACTICE QUESTION PAPER`;
    previewBrandTitle.textContent = `${platform} Practice Paper`;
    paperMockNumber.textContent = data.mockTestNumber || "Mock Test #1";
    if (paperSourcePlatform) paperSourcePlatform.textContent = platform;
    paperTestTitle.textContent = data.testTitle || "Mock Test";
    paperQuestionCount.textContent = data.totalQuestions || data.questions.length;
    footerPlatformText.textContent = `${platform} Practice Question Paper • ${data.mockTestNumber || ""}`;

    // Set default working space from popup choice
    if (data.workingSpace) {
      workspaceSelect.value = data.workingSpace;
    }

    // Render questions
    questionsList.innerHTML = "";

    data.questions.forEach((q) => {
      const qBlock = document.createElement("section");
      qBlock.className = "question-block";
      qBlock.id = `practice-q-${q.index}`;

      // Header row
      const headerRow = document.createElement("div");
      headerRow.className = "question-header-row";

      const titleSpan = document.createElement("div");
      titleSpan.className = "question-title";
      titleSpan.innerHTML = `
        <span>${escapeHtml(q.rawLabel || `Question ${q.index}`)}</span>
        <span class="question-type-tag">${q.type || "QUESTION"}</span>
      `;

      const marksSpan = document.createElement("div");
      marksSpan.className = "question-marks-badge";
      marksSpan.textContent = q.marks ? `[ ${q.marks} ]` : "";

      headerRow.appendChild(titleSpan);
      if (q.marks) headerRow.appendChild(marksSpan);
      qBlock.appendChild(headerRow);

      // Question Prompt
      const promptDiv = document.createElement("div");
      promptDiv.className = "question-prompt";
      promptDiv.innerHTML = q.promptHtml;
      qBlock.appendChild(promptDiv);

      // Options or NAT Answer Line
      if (q.options && q.options.length > 0) {
        const optionsDiv = document.createElement("div");
        optionsDiv.className = "question-options";

        const isMsq = q.type === "MSQ";

        q.options.forEach((opt) => {
          const optRow = document.createElement("div");
          optRow.className = "option-row";

          const marker = document.createElement("div");
          marker.className = "option-marker";
          marker.innerHTML = `
            <span class="choice-box ${isMsq ? "square" : "circle"}"></span>
            <span>${escapeHtml(opt.letter || "")}</span>
          `;

          const body = document.createElement("div");
          body.className = "option-body";
          body.innerHTML = opt.html || escapeHtml(opt.text || "");

          optRow.appendChild(marker);
          optRow.appendChild(body);
          optionsDiv.appendChild(optRow);
        });

        qBlock.appendChild(optionsDiv);
      } else {
        // NAT / Numerical question
        const natDiv = document.createElement("div");
        natDiv.className = "nat-answer-row";
        natDiv.innerHTML = `<span>Answer:</span> <span class="answer-line"></span>`;
        qBlock.appendChild(natDiv);
      }

      // Ruled Working Space Box
      const wsBox = document.createElement("div");
      wsBox.className = `working-space-box workspace-${workspaceSelect.value}`;
      wsBox.innerHTML = `
        <div class="workspace-label">Working / Rough Space:</div>
        <div class="workspace-lines"></div>
      `;
      qBlock.appendChild(wsBox);

      questionsList.appendChild(qBlock);
    });
  }

  // Update working space size live
  workspaceSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    document.querySelectorAll(".working-space-box").forEach((el) => {
      el.className = `working-space-box workspace-${val}`;
    });
  });

  // Update font size live
  fontSizeSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    document.body.classList.remove("font-compact", "font-normal", "font-large");
    if (val === "compact") document.body.classList.add("font-compact");
    if (val === "large") document.body.classList.add("font-large");
  });

  // Print button
  btnPrint.addEventListener("click", () => {
    window.print();
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
