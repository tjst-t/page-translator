// TODO: implement Google Translate injection
// - Inject element.js into the page
// - Initialize TranslateElement with selected languages
// - Trigger translation via .goog-te-combo
// - Hide Google Translate banner
// - Provide restore functionality

export interface TranslateOptions {
  srcLang: string;
  tgtLang: string;
}

export function injectGoogleTranslate(options: TranslateOptions): void {
  // TODO
}

export function restoreOriginal(): void {
  // TODO
}
