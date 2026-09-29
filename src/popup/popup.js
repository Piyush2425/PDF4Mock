/**
 * NPTEL & GATEOverflow Practice PDF - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // UI Elements
  const statusCard = document.getElementById("statusCard");
  const statusIcon = document.getElementById("statusIcon");
  const statusTitle = document.getElementById("statusTitle");
  const statusDesc = document.getElementById("statusDesc");
  const platformSubtitle = document.getElementById("platformSubtitle");
  const testInfoSection = document.getElementById("testInfoSection");
  const mockNumberInput = document.getElementById("mockNumberInput");
  const testTitleInput = document.getElementById("testTitleInput");
  const modeBadge = document.getElementById("modeBadge");
  const questionCountBadge = document.getElementById("questionCountBadge");
  const settingsSection = document.getElementById("settingsSection");
  const guidanceSection = document.getElementById("guidanceSection");
  const consentCheckboxLabel = document.getElementById("consentCheckboxLabel");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnGenerateText = document.getElementById("btnGenerateText");
  const btnRefresh = document.getElementById("btnRefresh");

  // Debug elements
  const debugPlatform = document.getElementById("debugPlatform");
  const debugMode = document.getElementById("debugMode");
  const debugCards = document.getElementById("debugCards");
  const debugMcqCount = document.getElementById("debugMcqCount");
  const debugMsqCount = document.getElementById("debugMsqCount");
  const debugNatCount = document.getElementById("debugNatCount");
  const debugImages = document.getElementById("debugImages");
  const debugRawLeaks = document.getElementById("debugRawLeaks");

  // Setup radio cards interactive styles
  const radioCards = document.querySelectorAll(".radio-card");
  radioCards.forEach(card => {
    card.addEventListener("click", () => {
      radioCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
    });
  });

  // Get active tab
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Ensure content script is injected
  async function ensureContentScript(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: "INSPECT_TEST" });
      return response;
    } catch (err) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["src/content/content.js"]
        });
        return await chrome.tabs.sendMessage(tabId, { action: "INSPECT_TEST" });
      } catch (injectionError) {
        console.error("Failed to inject content script:", injectionError);
        return null;
      }
    }
  }

  // Inspect current page
  async function checkCurrentTab() {
    statusCard.className = "status-card pending";
    statusIcon.textContent = "⏳";
    statusTitle.textContent = "Detecting Assessment...";
    statusDesc.textContent = "Scanning tab for NPTEL or GATEOverflow mock test...";
    testInfoSection.classList.add("hidden");
    settingsSection.classList.add("hidden");
    guidanceSection.classList.add("hidden");

    const tab = await getActiveTab();
    if (!tab || !tab.url) {
      showErrorState("No active tab found", "Please open NPTEL or GATEOverflow in your browser.");
      return;
    }

    const report = await ensureContentScript(tab.id);

    if (!report || !report.isSupportedPlatform) {
      showErrorState(
        "Supported Mock Test Not Found",
        "Please open seek.nptel.ac.in or gateoverflow.in/quiz/quiz.php."
      );
      guidanceSection.classList.remove("hidden");
      return;
    }

    const platform = report.platformName || "Mock Test";
    platformSubtitle.textContent = `${platform} Exporter`;
    debugPlatform.textContent = platform;

    const isList = !!report.isListView;
    modeBadge.textContent = isList ? "⚡ List View (Instant)" : "🔄 Paginated (Auto-Step)";
    modeBadge.style.background = isList ? "#dcfce7" : "#e0f2fe";
    modeBadge.style.color = isList ? "#15803d" : "#0369a1";
    modeBadge.style.borderColor = isList ? "#bbf7d0" : "#bae6fd";
    debugMode.textContent = report.viewMode || (isList ? "List View" : "Paginated View");

    // Populate debug stats
    if (report.debugStats) {
      debugCards.textContent = report.debugStats.totalCards;
      debugMcqCount.textContent = report.debugStats.mcqCount ?? "-";
      debugMsqCount.textContent = report.debugStats.msqCount ?? "-";
      debugNatCount.textContent = report.debugStats.natCount ?? "-";
      debugImages.textContent = report.debugStats.totalImages ?? "0";
      debugRawLeaks.textContent = report.debugStats.potentialLeaksDetectedInRawDom ?? "0";
    }

    if (report.totalQuestions === 0) {
      showErrorState(
        `${platform} Question View Not Detected`,
        "Ensure the test or quiz has finished loading on this page."
      );
      guidanceSection.classList.remove("hidden");
      return;
    }

    // Hide consent option if not NPTEL
    if (report.platformId !== "nptel-seek") {
      consentCheckboxLabel.classList.add("hidden");
    } else {
      consentCheckboxLabel.classList.remove("hidden");
    }

    // Valid test detected!
    statusCard.className = "status-card success";
    statusIcon.textContent = "✅";
    statusTitle.textContent = `${platform} Detected`;
    statusDesc.textContent = isList
      ? `Found ${report.totalQuestions} questions in List View.`
      : `Found ${report.totalQuestions} questions in Paginated View.`;

    mockNumberInput.value = report.mockTestNumber || "Mock Test #1";
    testTitleInput.value = report.testTitle || `${platform} Assessment`;
    questionCountBadge.textContent = `${report.totalQuestions} Question(s)`;

    btnGenerateText.textContent = isList
      ? "Generate Practice Paper"
      : `Export All ${report.totalQuestions} Questions`;

    testInfoSection.classList.remove("hidden");
    settingsSection.classList.remove("hidden");
  }

  function showErrorState(title, desc) {
    statusCard.className = "status-card error";
    statusIcon.textContent = "⚠️";
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
  }

  // Handle Export / Generate click
  btnGenerate.addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab) return;

    const selectedRadio = document.querySelector('input[name="workingSpace"]:checked');
    const workingSpace = selectedRadio ? selectedRadio.value : "medium";
    const includeConsent = document.getElementById("includeConsent") ? document.getElementById("includeConsent").checked : true;

    const customMockNumber = mockNumberInput.value.trim() || "Mock Test";
    const customTestTitle = testTitleInput.value.trim() || "GATE Mock Test";

    // UI Loading state
    btnGenerate.disabled = true;
    btnGenerateText.textContent = "Extracting & compiling questions...";
    statusTitle.textContent = "Generating Practice Paper...";
    statusDesc.textContent = "Processing questions into clean practice paper...";

    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: "EXTRACT_PRACTICE_PAPER",
        options: {
          workingSpace,
          includeConsent,
          customMockNumber,
          customTestTitle
        }
      });

      if (!result || !result.success) {
        alert("Extraction failed: " + (result?.error || "Unknown error occurred."));
        btnGenerate.disabled = false;
        btnGenerateText.textContent = "Generate Practice Paper";
        return;
      }

      // Leakage Check Security Gate
      if (result.leakCheck && !result.leakCheck.passed) {
        alert(`SECURITY HALT: Possible answer/evaluation information detected in ${result.leakCheck.leakCount} location(s). Practice PDF generation was stopped to prevent answer leakage.\n\nDetails:\n${result.leakCheck.leakDetails.slice(0, 3).join("\n")}`);
        btnGenerate.disabled = false;
        btnGenerateText.textContent = "Generate Practice Paper";
        return;
      }

      // Store normalized data in storage
      const payload = {
        platformName: result.platformName || "GATE Mock Test",
        mockTestNumber: customMockNumber,
        testTitle: customTestTitle,
        url: result.url,
        generatedAt: result.generatedAt,
        totalQuestions: result.totalExtracted,
        workingSpace: workingSpace,
        questions: result.questions
      };

      await chrome.storage.local.set({ "nptel_practice_paper_data": payload });

      // Open Preview Page
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/preview/preview.html")
      });

      window.close();
    } catch (err) {
      console.error("Extraction error:", err);
      alert("Error generating practice paper: " + err.message);
      btnGenerate.disabled = false;
      btnGenerateText.textContent = "Generate Practice Paper";
    }
  });

  btnRefresh?.addEventListener("click", checkCurrentTab);

  // Initial load
  checkCurrentTab();
});
