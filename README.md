# my-tetris

Tetris Guideline に準拠したテトリスゲーム。TypeScript と Canvas API で実装。

## 機能一覧

### ゲームプレイ
- 7種類のテトリミノ（I, O, T, S, Z, J, L）
- SRS（Super Rotation System）回転システム
- Wall Kick 対応
- T-Spin 判定（Full / Mini）
- ゴーストピース表示
- Hold 機能
- NEXT 表示（5個先まで）

### スコアリング
- Tetris Guideline 準拠のスコア計算
- ライン消去ボーナス（Single / Double / Triple / Tetris）
- T-Spin ボーナス
- Back-to-Back ボーナス
- コンボシステム
- ソフトドロップ / ハードドロップボーナス

### その他の機能
- リプレイ記録・再生
- ハイスコアランキング（ローカル保存）
- 設定画面
- 統計情報表示
- 一時停止機能

## セットアップ

### 必要な環境
- Node.js 18 以上

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開く。

### ビルド

```bash
npm run build
```

`dist/` ディレクトリに出力される。

## 技術スタック

- **言語**: TypeScript
- **ビルドツール**: Vite
- **描画**: Canvas API
- **テスト**: Vitest
- **リンター**: ESLint
- **フォーマッター**: Prettier

## ディレクトリ構成

```
src/
├── main.ts           # エントリーポイント
├── style.css         # スタイルシート
├── game/             # ゲームロジック
│   ├── Board.ts      # ゲームボード
│   ├── Tetromino.ts  # テトリミノ定義
│   ├── SRS.ts        # 回転システム
│   ├── TSpin.ts      # T-Spin 判定
│   └── ...
├── systems/          # ゲームシステム
│   ├── GameManager.ts    # ゲーム管理
│   ├── ScoreManager.ts   # スコア管理
│   ├── InputHandler.ts   # 入力処理
│   └── ...
├── rendering/        # 描画処理
│   ├── Renderer.ts   # メインレンダラー
│   └── ...
├── storage/          # データ保存
│   ├── HighScoreManager.ts   # ハイスコア管理
│   ├── ReplayManager.ts      # リプレイ管理
│   └── ...
├── ui/               # UI コンポーネント
│   └── UIRenderer.ts # UI 描画
└── types/            # 型定義
    └── index.ts
```

## 操作方法

| キー | 操作 |
|------|------|
| ← / → | 左右移動 |
| ↓ | ソフトドロップ |
| Space | ハードドロップ |
| ↑ / X | 右回転（時計回り） |
| Z / Ctrl | 左回転（反時計回り） |
| C / Shift | ホールド |
| Escape / P | 一時停止 |

## ライセンス

MIT
