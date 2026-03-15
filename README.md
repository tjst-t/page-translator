# PageTranslator

Google翻訳の `element.js` をページに注入し、ページ全体を翻訳するChromium拡張機能。

VivaldiなどChrome以外のChromiumブラウザで、Google翻訳公式拡張から削除されたページ翻訳機能を代替する。

## 機能

- ページ全体のGoogle翻訳
- 翻訳元/翻訳先言語の選択
- 原文への復元
- Google Translate バナーの非表示

## 技術スタック

- Manifest V3
- Chrome Extensions API (`scripting`, `activeTab`)
- Google Translate element.js injection

## 開発

### ビルド

```bash
npm install
npm run build
```

ビルド成果物は `dist/` に出力される。

### 拡張機能のロード

1. `vivaldi://extensions` を開く
2. デベロッパーモードをON
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` フォルダを選択

### lint / format

```bash
npm run lint
npm run format
```

## ディレクトリ構成

```
src/
  popup/          # ポップアップUI
    popup.html
    popup.css
    popup.ts
  content/        # Content Script (翻訳注入ロジック)
    inject.ts
  background/     # Service Worker (将来用)
    service-worker.ts
  types/          # 型定義
    index.ts
  manifest.json
assets/
  icons/          # 拡張機能アイコン
scripts/
  build.ts        # ビルドスクリプト
  gen-icons.ts    # アイコン生成スクリプト
```

## ライセンス

MIT
