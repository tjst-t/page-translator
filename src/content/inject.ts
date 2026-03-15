export interface TranslateOptions {
  srcLang: string;
  tgtLang: string;
}

const ELEMENT_JS_URL =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

function hideBanner(): void {
  if (document.getElementById("page-translator-hide-banner")) return;
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

function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

async function injectGoogleTranslate(options: TranslateOptions): Promise<void> {
  // Prevent double injection
  if (document.getElementById("page-translator-script")) {
    const combo = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (combo) {
      combo.value = options.tgtLang;
      combo.dispatchEvent(new Event("change"));
    }
    return;
  }

  hideBanner();

  // Set up the init callback on the global scope
  // biome-ignore lint/suspicious/noExplicitAny: Google Translate global callback
  (window as any).googleTranslateElementInit = () => {
    // biome-ignore lint/suspicious/noExplicitAny: Google Translate API
    new (window as any).google.translate.TranslateElement(
      {
        pageLanguage: options.srcLang === "auto" ? "" : options.srcLang,
        includedLanguages: options.tgtLang,
        autoDisplay: false,
      },
      "page-translator-element",
    );
  };

  // Create container for TranslateElement
  const container = document.createElement("div");
  container.id = "page-translator-element";
  container.style.display = "none";
  document.body.appendChild(container);

  // Inject element.js
  const script = document.createElement("script");
  script.id = "page-translator-script";
  script.src = ELEMENT_JS_URL;
  document.body.appendChild(script);

  // Wait for the combo to appear then trigger translation
  try {
    const combo = (await waitForElement(".goog-te-combo")) as HTMLSelectElement;
    combo.value = options.tgtLang;
    combo.dispatchEvent(new Event("change"));
  } catch {
    console.error("PageTranslator: Failed to trigger translation");
  }
}

function restoreOriginal(): void {
  const combo = document.querySelector(
    ".goog-te-combo",
  ) as HTMLSelectElement | null;
  if (combo) {
    combo.value = "";
    combo.dispatchEvent(new Event("change"));
  }
}

// Listen for events from the popup
document.addEventListener("pageTranslatorTranslate", (e) => {
  const detail = (e as CustomEvent).detail as TranslateOptions;
  injectGoogleTranslate(detail);
});

document.addEventListener("pageTranslatorRestore", () => {
  restoreOriginal();
});
