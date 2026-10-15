<p align="center">
  <img src="icons/logo.png" alt="PDF4Mock Logo" width="130" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
</p>

<h1 align="center">PDF4Mock</h1>

<p align="center">
  <strong>Convert NPTEL & GATEOverflow mock tests into clean, printable A4 practice question papers with zero answer leakage.</strong>
</p>

<p align="center">
  <a href="https://github.com/Piyush2425/PDF4Mock"><img src="https://img.shields.io/badge/Version-1.3.0-blue?style=flat-square" alt="Version"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest V3"></a>
  <a href="https://brave.com/"><img src="https://img.shields.io/badge/Brave-Compatible-FB542B?style=flat-square&logo=brave&logoColor=white" alt="Brave"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"></a>
  <a href="#"><img src="https://img.shields.io/badge/Execution-100%25%20Local-blueviolet?style=flat-square" alt="100% Local"></a>
  <a href="#"><img src="https://img.shields.io/badge/Answer%20Leakage-Zero%20Tolerance-success?style=flat-square" alt="Zero Leakage"></a>
</p>

---

## 📌 Table of Contents

- [Overview & The Problem](#-overview--the-problem)
- [Key Features](#-key-features)
- [Supported Platforms](#-supported-platforms)
- [How It Works](#-how-it-works)
- [Installation Guide](#-installation-guide)
- [How to Use](#-how-to-use)
  - [NPTEL Mock Tests](#1-nptel-mock-tests-seeknptelacin)
  - [GATEOverflow Quizzes](#2-gateoverflow-quizzes-gateoverflowin)
  - [Printing & Saving as PDF](#3-printing--saving-as-pdf)
- [Project Architecture](#-project-architecture)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview & The Problem

Practicing competitive examination questions on real paper is the most effective way to simulate actual exam pressure and time management for **GATE (CS, DA, EC, EE, ME, etc.)**.

However, online platforms like **NPTEL** and **GATEOverflow** show questions with:
- Correct and expected answers already highlighted
- Evaluation scores, attempts, and answer explanations
- Live timers, interactive radio/checkbox inputs, and submission buttons

**PDF4Mock** solves this by extracting full mock tests directly in your browser and formatting them into a distraction-free, printable A4 Practice Paper with customizable rough working space and zero answer leakage.

---

## ✨ Key Features

- 🛡️ **Zero Answer Leakage Guarantee**: Strips all expected answers, evaluation badges, score boxes, and response indicators before generating the document.
- 📐 **Customizable Working Space**: Choose between **Small (~2 lines)**, **Medium (~5 lines)**, **Large (~8 lines)**, or **None** ruled working space per question.
- 🖨️ **Print-Optimized A4 Layout**: High-contrast, clean typography with `@page { size: A4; margin: 16mm; }` and `break-inside: avoid;` to prevent awkward question splits across pages.
- 🔬 **Media & Formula Preservation**: Preserves LaTeX/KaTeX mathematical expressions, MathML, diagrams, code blocks, tables, and base64 embedded images.
- 🔄 **Dual-Engine Extraction**:
  - **List View**: Instant 1-click bulk capture from continuous-scroll pages (`.linear-view` / `#viewQPDiv`).
  - **Paginated View**: Safe, automated stepping through question chips (`1` to `65`) without modifying answers or submitting.
- 🔒 **100% Private & Local**: Zero telemetry, no external backend. All processing occurs locally within your authenticated browser session.

---

## 🌐 Supported Platforms

| Platform | URL Pattern | View Modes Supported |
| :--- | :--- | :--- |
| **NPTEL Mock Tests** | `https://seek.nptel.ac.in/*` | • List View (`.linear-view`)<br>• Paginated View (Chips `1`–`65`) |
| **GATEOverflow** | `https://gateoverflow.in/quiz/quiz.php*`<br>`https://gateoverflow.in/quiz/results.php*` | • Results View (`results.php` - answers stripped, discuss kept)<br>• Question Paper View (`#viewQPDiv`)<br>• Paginated Quiz View |

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    SOURCE DETECTION                     │
├────────────────────────────┬────────────────────────────┤
│     1. List View Source    │  2. Paginated Page View    │
│  (NPTEL .linear-view /     │  (Active Question +        │
│  GATEOverflow #viewQPDiv)  │   Question Palette Nav)    │
└─────────────┬──────────────┴─────────────┬──────────────┘
              │                            │
              │ Instant Bulk Extraction    │ Safe Automated Stepper
              ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│            INTERNAL NORMALIZED QUESTION MODEL           │
│  - Question Number, Section & Marks                     │
│  - Clean Prompt HTML (Formulas, Diagrams, Images, Code) │
│  - Clean Options (MCQ ○, MSQ ☐, NAT Blank Lines)        │
│  - Fingerprint Deduplication & Zero-Leakage Scanner     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              UNIFIED PRACTICE PAPER OUTPUT              │
│  - Printable A4 Layout with Ruled Working Space Lines   │
│  - Zero Answers / Zero Interactive Controls             │
│  - Instant PDF Export via Ctrl + P                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📥 Installation Guide

Compatible with **Google Chrome**, **Brave Browser**, **Microsoft Edge**, and any Chromium browser.

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/Piyush2425/PDF4Mock.git
   ```
2. Open your browser extensions manager:
   - **Brave**: `brave://extensions`
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left).
5. Select the downloaded `PDF4Mock` (or `GATE EXTENSION`) folder.
6. Click the extension icon (🧩) and **Pin (📌)** **PDF4Mock** to your toolbar!

---

## 🚀 How to Use

### 1. NPTEL Mock Tests (`seek.nptel.ac.in`)

1. Open and log in to your mock test on `https://seek.nptel.ac.in/`.
2. Open the test (in either **List View** or **Paginated View** with chips `1` to `65`).
3. Click the **PDF4Mock** icon in your toolbar.
4. Verify the detected questions count (e.g. `65 Questions`).
5. Choose your desired working space height (`Small`, `Medium`, or `Large`).
6. Click **[ Export All Questions ]** (or **[ Generate Practice Paper ]**).
7. A clean, printable tab will open automatically.

### 2. GATEOverflow Quizzes & Results (`gateoverflow.in`)

1. Open your quiz on `https://gateoverflow.in/quiz/quiz.php` or your evaluated test on `https://gateoverflow.in/quiz/results.php`.
2. *(For quiz.php)* You can click the **"Question Paper"** button or let PDF4Mock step through questions.
3. *(For results.php)* PDF4Mock automatically extracts all questions in one instant click, stripping your attempted answers, correct answers, time taken, and evaluation results.
4. Each question retains a clickable **"Discuss on GATEOverflow"** link for convenient post-practice review!
5. Click the **PDF4Mock** extension icon and press **[ Generate Practice Paper ]**.

### 3. Printing & Saving as PDF

1. On the generated preview tab, click **🖨️ Print / Save as PDF** (or press **`Ctrl + P`**).
2. Set the following print settings:
   - **Destination**: `Save as PDF` (or choose your printer)
   - **Paper Size**: `A4`
   - **Margins**: `Default`
   - **Options**: Enable **Background graphics** *(ensures ruled working lines and checkboxes print crisply)*
3. Click **Save**!

---

## 📂 Project Architecture

```
PDF4Mock/
├── .gitignore                 # Git ignore rules
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT License
├── README.md                  # Project documentation
├── manifest.json              # Chrome Manifest V3 configuration
├── icons/
│   ├── logo.png               # High-res project logo
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── content/
    │   └── content.js         # NPTEL & GATEOverflow DOM extractors & sanitizer
    ├── popup/
    │   ├── popup.html         # Modern extension popup interface
    │   ├── popup.css          # Popup styling
    │   └── popup.js           # Inspection controller & export trigger
    └── preview/
        ├── preview.html       # Print preview paper document
        ├── preview.css        # A4 print stylesheet
        └── preview.js         # Renderer with live working space adjuster
```

---

## 🤝 Contributing

Contributions are welcome! If you want to refine extraction for specific subjects, improve math rendering, or report issues:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewFeature`).
3. Commit your Changes (`git commit -m 'Add some feature'`).
4. Push to the Branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Piyush2425">Piyush</a> for GATE Aspirants.
</p>