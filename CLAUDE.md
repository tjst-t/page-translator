# PageTranslator - Claude Code Instructions

## プロジェクト概要

Google翻訳の `element.js` を対象ページに注入し、ページ全体を翻訳するChromium拡張機能（Manifest V3）。
VivaldiでGoogle翻訳公式拡張から削除されたページ翻訳機能を代替する。

## 技術スタック

- TypeScript
- Manifest V3 Chrome Extensions API
- Biome (lint/format)
- tsx (ビルドスクリプト実行)

## ディレクトリ構成

- `src/popup/` — ポップアップUI (HTML/CSS/TS)
- `src/content/` — Content Script（翻訳注入ロジック）
- `src/background/` — Service Worker
- `src/types/` — 共有型定義
- `assets/icons/` — 拡張機能アイコン
- `scripts/` — ビルド・ユーティリティスクリプト
- `dist/` — ビルド成果物（gitignore）

## コマンド

- `npm run build` — dist/ にビルド
- `npm run lint` — Biome lint
- `npm run format` — Biome format
- `npm run typecheck` — TypeScript型チェック

## 翻訳の仕組み

1. ユーザーがポップアップで翻訳元/翻訳先言語を選択
2. `chrome.scripting.executeScript` でContent Scriptを対象タブに注入
3. Content Scriptが `translate.google.com/translate_a/element.js` を `<script>` タグでページに追加
4. `google.translate.TranslateElement` を初期化し、`.goog-te-combo` のselectを操作して翻訳を発火
5. Google Translateのバナーは CSS で非表示にする

## 注意事項

- `element.js` はGoogleのウェブサイト翻訳用公開スクリプトだが、将来廃止される可能性あり
- `chrome://` や `vivaldi://` などブラウザ内部ページでは `scripting.executeScript` が使えない
- `storage` パーミッションで言語設定を永続化する
