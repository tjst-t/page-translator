import { SUPPORTED_LANGUAGES } from "../types/index.js";

const STORAGE_KEY = "pageTranslatorLangConfig";

const srcLangSelect = document.getElementById("src-lang") as HTMLSelectElement;
const tgtLangSelect = document.getElementById("tgt-lang") as HTMLSelectElement;
const btnTranslate = document.getElementById(
  "btn-translate",
) as HTMLButtonElement;
const btnRestore = document.getElementById("btn-restore") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function populateSelects() {
  for (const lang of SUPPORTED_LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = lang.label;
    srcLangSelect.appendChild(opt);
  }

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.code === "auto") continue;
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = lang.label;
    tgtLangSelect.appendChild(opt);
  }
}

async function loadSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const config = result[STORAGE_KEY] as
    | { srcLang?: string; tgtLang?: string }
    | undefined;
  srcLangSelect.value = config?.srcLang ?? "auto";
  tgtLangSelect.value = config?.tgtLang ?? "ja";
}

async function saveSettings() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      srcLang: srcLangSelect.value,
      tgtLang: tgtLangSelect.value,
    },
  });
}

function showStatus(message: string, type: "success" | "error") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
  setTimeout(() => {
    statusEl.hidden = true;
  }, 3000);
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

btnTranslate.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (
    !tab.id ||
    !tab.url ||
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("vivaldi://") ||
    tab.url.startsWith("about:")
  ) {
    showStatus("このページでは翻訳できません", "error");
    return;
  }

  const srcLang = srcLangSelect.value;
  const tgtLang = tgtLangSelect.value;

  await saveSettings();

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      files: ["content/inject.js"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (src: string, tgt: string) => {
        const event = new CustomEvent("pageTranslatorTranslate", {
          detail: { srcLang: src, tgtLang: tgt },
        });
        document.dispatchEvent(event);
      },
      args: [srcLang, tgtLang],
    });

    showStatus("翻訳を実行中…", "success");
  } catch (err) {
    showStatus(`エラー: ${(err as Error).message}`, "error");
  }
});

btnRestore.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        document.dispatchEvent(new CustomEvent("pageTranslatorRestore"));
      },
    });
    showStatus("原文を復元しました", "success");
  } catch (err) {
    showStatus(`エラー: ${(err as Error).message}`, "error");
  }
});

populateSelects();
loadSettings();
