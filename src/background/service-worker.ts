const STORAGE_KEY = "pageTranslatorLangConfig";
const MENU_ID = "page-translator-translate";

const BLOCKED_PREFIXES = [
  "chrome://",
  "vivaldi://",
  "edge://",
  "about:",
  "chrome-extension://",
];

function isTranslatablePage(url: string | undefined): boolean {
  if (!url) return false;
  return !BLOCKED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// --- Auto-translate tracking ---

/** Tab IDs where auto-translation is active on navigation */
const autoTranslateTabs = new Set<number>();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!autoTranslateTabs.has(tabId)) return;
  if (changeInfo.status !== "complete") return;
  if (!isTranslatablePage(tab.url)) return;

  try {
    await translateTab(tabId);
  } catch {
    autoTranslateTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  autoTranslateTabs.delete(tabId);
});

// --- Context menu ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "このページを翻訳",
    contexts: ["page"],
  });
});

// --- Translation via element.js ---

async function translateTab(tabId: number) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const config = result[STORAGE_KEY] as
    | { srcLang?: string; tgtLang?: string }
    | undefined;
  const srcLang = config?.srcLang ?? "auto";
  const tgtLang = config?.tgtLang ?? "ja";

  // Check if already injected
  const [{ result: alreadyDone }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (tgt: string) => {
      const combo = document.querySelector(
        ".goog-te-combo",
      ) as HTMLSelectElement | null;
      if (combo) {
        combo.value = tgt;
        combo.dispatchEvent(new Event("change"));
        return true;
      }
      return false;
    },
    args: [tgtLang],
  });

  if (alreadyDone) return;

  // Set up callback, container, banner CSS
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (src: string, tgt: string) => {
      if (!document.getElementById("page-translator-hide-banner")) {
        const style = document.createElement("style");
        style.id = "page-translator-hide-banner";
        style.textContent = `
          .goog-te-banner-frame, .skiptranslate, #goog-gt-tt {
            display: none !important;
          }
          body { top: 0 !important; }
        `;
        document.head.appendChild(style);
      }

      if (!document.getElementById("page-translator-element")) {
        const container = document.createElement("div");
        container.id = "page-translator-element";
        container.style.display = "none";
        document.body.appendChild(container);
      }

      // biome-ignore lint/suspicious/noExplicitAny: Google Translate global
      (window as any).googleTranslateElementInit = () => {
        // biome-ignore lint/suspicious/noExplicitAny: Google Translate API
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: src === "auto" ? "" : src,
            includedLanguages: tgt,
            autoDisplay: false,
          },
          "page-translator-element",
        );
      };
    },
    args: [srcLang, tgtLang],
  });

  // Inject element.js (bypasses CSP)
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    files: ["vendor/element.js"],
  });

  // Wait for combo and trigger translation
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (tgt: string) => {
      return new Promise<void>((resolve) => {
        const maxWait = 15000;
        const start = Date.now();
        const check = () => {
          const combo = document.querySelector(
            ".goog-te-combo",
          ) as HTMLSelectElement | null;
          if (combo) {
            combo.value = tgt;
            combo.dispatchEvent(new Event("change"));
            resolve();
            return;
          }
          if (Date.now() - start < maxWait) {
            setTimeout(check, 200);
          } else {
            resolve();
          }
        };
        check();
      });
    },
    args: [tgtLang],
  });
}

// Context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id && isTranslatablePage(tab.url)) {
    await translateTab(tab.id);
    autoTranslateTabs.add(tab.id);
  }
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "translate-page") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id && isTranslatablePage(tab.url)) {
      await translateTab(tab.id);
      autoTranslateTabs.add(tab.id);
    }
  }
});

// Expose translateTab on globalThis for DevTools / Puppeteer evaluate access
// biome-ignore lint/suspicious/noExplicitAny: expose for testing
(self as any).translateTab = translateTab;

// Message listener (used by popup and tests)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "translateTab" && typeof message.tabId === "number") {
    translateTab(message.tabId).then(
      () => {
        autoTranslateTabs.add(message.tabId);
        sendResponse({ ok: true });
      },
      (err) => sendResponse({ ok: false, error: (err as Error).message }),
    );
    return true; // keep channel open for async response
  }
  if (message.action === "restoreTab" && typeof message.tabId === "number") {
    autoTranslateTabs.delete(message.tabId);
    chrome.scripting
      .executeScript({
        target: { tabId: message.tabId },
        world: "MAIN",
        func: () => {
          const combo = document.querySelector(
            ".goog-te-combo",
          ) as HTMLSelectElement | null;
          if (combo) {
            combo.value = "";
            combo.dispatchEvent(new Event("change"));
          }
        },
      })
      .then(
        () => sendResponse({ ok: true }),
        (err) => sendResponse({ ok: false, error: (err as Error).message }),
      );
    return true;
  }
});
