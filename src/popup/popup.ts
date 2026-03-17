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

let statusTimer: ReturnType<typeof setTimeout> | undefined;

function showStatus(
  message: string,
  type: "success" | "error",
  autoHide = true,
) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
  if (statusTimer) clearTimeout(statusTimer);
  if (autoHide) {
    statusTimer = setTimeout(() => {
      statusEl.hidden = true;
    }, 3000);
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// --- Event handlers ---
// Delegate to service worker via message (proven to work in E2E tests)

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

  await saveSettings();

  try {
    showStatus("翻訳を実行中…", "success", false);
    const response = await chrome.runtime.sendMessage({
      action: "translateTab",
      tabId: tab.id,
    });
    if (response?.ok) {
      showStatus("翻訳完了", "success");
    } else {
      showStatus(`エラー: ${response?.error ?? "不明なエラー"}`, "error");
    }
  } catch (err) {
    showStatus(`エラー: ${(err as Error).message}`, "error");
  }
});

btnRestore.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab.id) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "restoreTab",
      tabId: tab.id,
    });
    if (response?.ok) {
      showStatus("原文を復元しました", "success");
    } else {
      showStatus(`エラー: ${response?.error ?? "不明なエラー"}`, "error");
    }
  } catch (err) {
    showStatus(`エラー: ${(err as Error).message}`, "error");
  }
});

populateSelects();
loadSettings();
