const STORAGE_KEY = "pageTranslatorLangConfig";
const MENU_ID = "page-translator-translate";

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "このページを翻訳",
    contexts: ["page"],
  });
});

async function translateTab(tabId: number) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const config = result[STORAGE_KEY] as
    | { srcLang?: string; tgtLang?: string }
    | undefined;
  const srcLang = config?.srcLang ?? "auto";
  const tgtLang = config?.tgtLang ?? "ja";

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    files: ["content/inject.js"],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (src: string, tgt: string) => {
      document.dispatchEvent(
        new CustomEvent("pageTranslatorTranslate", {
          detail: { srcLang: src, tgtLang: tgt },
        }),
      );
    },
    args: [srcLang, tgtLang],
  });
}

// Context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id) {
    await translateTab(tab.id);
  }
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "translate-page") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await translateTab(tab.id);
    }
  }
});
