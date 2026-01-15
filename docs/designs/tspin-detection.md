# T-Spin 判定機能

## 概要

T-Spin は Tetris Guideline で定義された特殊なスコアリング技術で、T-テトリミノを回転させて隙間に入れることでボーナススコアを獲得できる。本ドキュメントでは、このプロジェクトで実装された T-Spin 判定ロジックの仕様を説明する。

### 関連ファイル

- 実装: `src/game/TSpin.ts`
- テスト: `src/game/TSpin.test.ts`
- 型定義: `src/types/index.ts` (`TSpinType`, `LineClearResult`)

## 3コーナールール

T-Spin の判定には「3コーナールール」を使用する。これは Tetris Guideline で規定された公式の判定方法である。

### 判定条件

T-Spin が発生するためには、以下の条件をすべて満たす必要がある：

1. **T-テトリミノであること** - 他のテトリミノでは T-Spin は発生しない
2. **最後の操作が回転であること** - 移動やドロップではなく、回転操作で固定された場合のみ
3. **3つ以上のコーナーが埋まっていること** - T-テトリミノの中心を囲む4つのコーナーのうち、少なくとも3つが埋まっている（壁、床、または他のブロック）

### コーナーの位置

T-テトリミノの中心を基準とした4つのコーナー位置：

```
回転状態 0（上向き）:
   [A]   [B]
      [T]
   [C]   [D]

A: 左前コーナー (-1, -1)
B: 右前コーナー (+1, -1)
C: 左後コーナー (-1, +1)
D: 右後コーナー (+1, +1)
```

「前」コーナーは T が向いている方向側、「後」コーナーは背中側を指す。

### 各回転状態のコーナー配置

| 回転状態 | 向き | 前コーナー | 後コーナー |
|---------|------|-----------|-----------|
| 0 | 上 | A, B | C, D |
| 1 | 右 | B, D | A, C |
| 2 | 下 | C, D | A, B |
| 3 | 左 | A, C | B, D |

## T-Spin の種類

### Full T-Spin（通常の T-Spin）

以下の条件を満たす場合：

- 3つ以上のコーナーが埋まっている
- **両方の前コーナー**が埋まっている
- 5番目の Wall Kick テスト（インデックス4以上）を使用していない

Full T-Spin は高得点を獲得できる。

### T-Spin Mini

以下のいずれかの条件を満たす場合、T-Spin Mini となる：

1. **前コーナーが1つだけ埋まっている** - 両方の前コーナーが埋まっていない
2. **5番目の Wall Kick テストを使用した** - SRS の Wall Kick で5番目のテスト（インデックス4）を使用して回転が成功した場合

T-Spin Mini は Full T-Spin よりも得点が低い。

### 判定フローチャート

```
T-テトリミノか？
  └── No → none
  └── Yes → 最後の操作が回転か？
              └── No → none
              └── Yes → コーナーが3つ以上埋まっているか？
                          └── No → none
                          └── Yes → Wall Kick インデックス >= 4 か？
                                      └── Yes → mini
                                      └── No → 前コーナーが両方埋まっているか？
                                                └── No → mini
                                                └── Yes → full
```

## TSpinType 型

```typescript
export type TSpinType = 'none' | 'mini' | 'full';
```

| 値 | 説明 |
|----|------|
| `'none'` | T-Spin ではない |
| `'mini'` | T-Spin Mini |
| `'full'` | Full T-Spin |

## LineClearResult 型

ライン消去の結果を表す型：

```typescript
export interface LineClearResult {
  /** 消去されたライン数 (0-4) */
  linesCleared: number;
  /** T-Spin の種類 */
  tspinType: TSpinType;
  /** 人間が読める説明 */
  description: string;
}
```

### description の例

| tspinType | linesCleared | description |
|-----------|-------------|-------------|
| `'none'` | 1 | "Single" |
| `'none'` | 4 | "Tetris" |
| `'mini'` | 0 | "T-Spin Mini" |
| `'mini'` | 1 | "T-Spin Mini Single" |
| `'full'` | 2 | "T-Spin Double" |
| `'full'` | 3 | "T-Spin Triple" |

## API リファレンス

### detectTSpin

T-Spin を検出するメイン関数。

```typescript
function detectTSpin(
  tetromino: Tetromino,
  board: Board,
  wasRotation: boolean,
  kickIndex: number
): TSpinResult;
```

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `tetromino` | `Tetromino` | 固定されるテトリミノ |
| `board` | `Board` | ゲームボード（**テトリミノ固定前**の状態） |
| `wasRotation` | `boolean` | 最後の操作が回転だったか |
| `kickIndex` | `number` | 使用された Wall Kick テストのインデックス（0 = キックなし） |

#### 戻り値

```typescript
interface TSpinResult {
  type: TSpinType;      // 検出された T-Spin の種類
  wasRotation: boolean; // 回転だったかどうか
}
```

### getTSpinDescription

T-Spin の結果を人間が読める説明文に変換する。

```typescript
function getTSpinDescription(tspinType: TSpinType, linesCleared: number): string;
```

#### 使用例

```typescript
import { detectTSpin, getTSpinDescription } from './TSpin.ts';

// T-Spin 判定（テトリミノ固定前に実行）
const result = detectTSpin(tetromino, board, wasRotation, kickIndex);

// テトリミノを固定し、ライン消去を実行
board.lockPiece(tetromino);
const linesCleared = board.clearLines();

// 説明文を取得
const description = getTSpinDescription(result.type, linesCleared);
console.log(description); // 例: "T-Spin Double"
```

## スコアリング

T-Spin によるスコアボーナスは `ScoreManager` で計算される。

| アクション | 基本得点 | Back-to-Back ボーナス |
|-----------|---------|---------------------|
| T-Spin (0 lines) | 400 | - |
| T-Spin Mini (0 lines) | 100 | - |
| T-Spin Single | 800 | +50% |
| T-Spin Mini Single | 200 | +50% |
| T-Spin Double | 1200 | +50% |
| T-Spin Mini Double | 400 | +50% |
| T-Spin Triple | 1600 | +50% |

**Back-to-Back**: T-Spin または Tetris を連続して達成した場合、スコアに 1.5 倍のボーナスが適用される。

## 実装上の注意点

### ボード状態のタイミング

`detectTSpin` は**テトリミノが固定される前**のボード状態で呼び出す必要がある。固定後に呼び出すと、テトリミノ自身のブロックがコーナー判定に影響し、誤った結果になる。

### Wall Kick インデックス

SRS の Wall Kick は最大5つのテストを試行する（インデックス 0-4）。5番目のテスト（インデックス4）で成功した場合、T-Spin Mini として扱われる。これは「奇妙な」回転で入り込んだ場合のペナルティである。

### 境界判定

ボード外の座標は「埋まっている」として扱われる。これにより、壁際での T-Spin が正しく判定される。
