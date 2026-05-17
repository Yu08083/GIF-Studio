## 使用リンク
https://yu08083.github.io/GIF-Studio/

# GIF Studio for Discord

**画質を保ったまま、Discord の上限ギリギリまで使い切る** ブラウザ完結ツール。
GIF の圧縮と、動画ファイルから GIF への変換(トリミング対応)に対応します。

サーバーへのアップロードは一切行わず、すべてブラウザ上の JavaScript で完結します。

## Discord の各用途に対応

Discord はメディア種別ごとに別のサイズ上限を持っています。本ツールでは用途ごとのプリセットを用意し、選択するだけで圧縮ターゲットが切り替わります。

| 用途              | 上限    | プリセット名              | 補足                                  |
|------------------|---------|------------------------|--------------------------------------|
| カスタム絵文字     | 256KB   | 絵文字                  | 128×128 推奨。アニメ絵文字は Nitro    |
| スタンプ          | 512KB   | スタンプ                | APNG/Lottie 形式は別。GIFで出すなら参考値 |
| **アバター / サーバーアイコン** | **8MB** | **アイコン (デフォルト)** | **アニメGIFアバターは Nitro 必須。サーバー動くアイコンは Boost Lv.1+** |
| チャット投稿 (Free) | 10MB   | チャット                | 一般ファイル添付の現在の上限           |
| Nitro Basic / Boost Lv.2 | 50MB | Nitro Basic        | チャット投稿上限                      |
| Nitro            | 500MB  | Nitro                  | チャット投稿上限                      |

**デフォルトは「アイコン (8MB)」** です。これは Discord ユーザーアバター・サーバーアイコンの GIF 上限と一致しています。

選択中のプリセットに合わせて、圧縮ロジックも自動的にターゲットサイズを調整します。アバター/アイコンは正方形が推奨されますが、本ツールはアスペクト比は変更しません(必要なら別途トリミング)。

## 画質に関する工夫

### 1. Floyd-Steinberg serpentine ディザリング
gif.js の dither を `FloydSteinberg-serpentine` で有効化。256色制限の GIF で発生しがちな、グラデーションの帯状ノイズ(バンディング)を散らし、自然な色階調を保ちます。

### 2. 段階的ダウンスケール
2倍以上の縮小では一発で縮小せず、半分ずつ複数回に分けて縮小します。1回の `drawImage` で大きく縮めるとエッジが甘くなったりエイリアシングが出るのを抑え、シャープに保ちます。

### 3. Canvas の高品質補間
すべての `CanvasRenderingContext2D` で `imageSmoothingQuality = 'high'` を有効化(ブラウザのリサンプリングを最高品質に)。

### 4. アルゴリズム
- **入力が既に上限以下**: 再エンコードせず原本パススルー(劣化ゼロ)
- **超過時**: 観測サイズベースの反復で `targetBytes`(上限の 99%)に収束
  - `scale = √(target / 観測サイズ)` で次の倍率を予測
  - 最大 5 回。実測ベースなので通常 2〜3 回で着地
  - 反復中の8MB以下のうち最大サイズを記憶 (best blob tracking)

## ファイル構成

```text
.
├── index.html
├── README.md
├── favicon.ico                       # 16/32/48 multi-resolution
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── apple-touch-icon.png              # 180×180 (iOS ホーム画面)
├── android-chrome-192x192.png        # PWA / Android
├── android-chrome-512x512.png        # PWA 大サイズ
├── og-image.png                      # 1200×630 OGP / Twitter Card
├── site.webmanifest                  # PWA マニフェスト
├── robots.txt
├── sitemap.xml
├── css/
│   ├── base.css
│   ├── preset.css
│   ├── tabs.css
│   ├── controls.css
│   ├── progress.css
│   ├── result.css
│   ├── video.css
│   └── responsive.css
└── js/
    ├── main.js
    ├── constants.js
    ├── preset.js
    ├── utils.js
    ├── canvas.js
    ├── dom.js
    ├── ui.js
    ├── tabs.js
    ├── presetController.js
    ├── gifCompress.js
    ├── gifCompressController.js
    ├── videoToGif.js
    └── videoToGifController.js
```

## 使用ライブラリ
- [gif.js](https://github.com/jnordberg/gif.js) — GIFエンコーダー(ディザリング対応)
- [omggif](https://github.com/deanm/omggif) — GIFデコーダー

CDN から読み込み。追加インストール不要。

## 実行方法
Web Worker と ES Modules を使用しているため、`index.html` をブラウザで直接開くだけでは動作しません。

- **VSCode Live Server**: `Go Live` ボタンをクリック
- **Python**: `python -m http.server 8000`
- **GitHub Pages**: このリポジトリを Pages にデプロイ

## このリリースの変更点

### Discord 用途別の上限に対応
- **アバター / サーバーアイコン: 8MB** をデフォルトに設定(アニメGIFアバター/動くサーバーアイコンの正しい上限)
- 絵文字 256KB / スタンプ 512KB のプリセット追加
- チャット投稿: Free 10MB / Nitro Basic 50MB / Nitro 500MB

### SEO / OGP / PWA
- 完全な favicon セット (`favicon.ico` 16/32/48 + 各サイズ PNG + Apple Touch + Android Chrome 192/512)
- Open Graph Protocol / Twitter Card 対応 (`og-image.png` 1200×630)
- 構造化データ (`application/ld+json` - WebApplication schema)
- `robots.txt` / `sitemap.xml`
- `site.webmanifest` (PWA)
- `meta name="theme-color"`、`color-scheme="dark"`
- 検索結果向けの `description` / `keywords`、`canonical` URL

### 画質改善
- **Floyd-Steinberg serpentine ディザリング** を有効化
- **段階的ダウンスケール** で縮小時の鮮鋭度を向上
- Canvas `imageSmoothingQuality = 'high'` を全箇所で有効化
- 動画→GIFのデフォルト幅 640 → **720px**

### UI 全面リデザイン
- Discord 風ダークテーマ(Blurple `#5865f2`)
- グラデーションタイトル + ロゴマーク
- プラン選択チップ(Free / Nitro Basic / Boost L3 / Nitro)
- ドロップゾーンのホバー/ドラッグオーバー演出
- 使用率バー(上限のうち何%使えたかを可視化)
- タブアイコン / グロー効果
- 完全レスポンシブ
