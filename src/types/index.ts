/**
 * Tetris Game Type Definitions
 * @module types
 * @description Core type definitions for a Tetris Guideline-compliant game.
 * Includes types for tetrominoes, game state, scoring, and configuration.
 */

/**
 * The seven standard tetromino types as defined by the Tetris Guideline.
 * Each letter represents the shape of the piece.
 */
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/**
 * Rotation states for tetrominoes.
 * - 0: Spawn state (initial orientation)
 * - 1: R (clockwise rotation from spawn)
 * - 2: 2 (180° rotation from spawn)
 * - 3: L (counter-clockwise rotation from spawn)
 */
export type RotationState = 0 | 1 | 2 | 3;

/**
 * Represents a position on the game board.
 * Origin (0,0) is at the top-left corner.
 */
export interface Position {
  /** Horizontal position (column) */
  x: number;
  /** Vertical position (row) */
  y: number;
}

/**
 * Represents a single cell on the game board.
 */
export interface Cell {
  /** Whether the cell is occupied by a locked piece */
  filled: boolean;
  /** CSS color string or null if empty */
  color: string | null;
}

/**
 * Configuration for the game board dimensions.
 * Standard Guideline dimensions are 10x20 with 4-row buffer.
 */
export interface BoardConfig {
  /** Board width in cells (standard: 10) */
  width: number;
  /** Visible board height in cells (standard: 20) */
  height: number;
  /** Hidden buffer rows above visible area (standard: 4) */
  bufferHeight: number;
}

/**
 * 4x4 matrix representing a tetromino shape.
 * 1 indicates a filled cell, 0 indicates empty.
 */
export type ShapeMatrix = readonly (readonly number[])[];

/**
 * Complete definition of a tetromino piece.
 */
export interface TetrominoDef {
  /** The tetromino type identifier */
  type: TetrominoType;
  /** CSS color for rendering */
  color: string;
  /** Shape matrices for each rotation state (4 total) */
  shapes: readonly ShapeMatrix[];
}

/**
 * State of the currently active (falling) tetromino.
 */
export interface ActiveTetromino {
  /** The tetromino type */
  type: TetrominoType;
  /** Current position on the board */
  position: Position;
  /** Current rotation state */
  rotation: RotationState;
}

/**
 * Possible states of the game.
 */
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

/**
 * Menu item options for navigation.
 */
export interface MenuItem {
  /** Display label for the menu item */
  label: string;
  /** Action identifier */
  action: string;
  /** Whether this item is currently selected */
  selected?: boolean;
}

/**
 * Configuration for UI overlay rendering.
 */
export interface UIOverlayConfig {
  /** Background color with alpha (e.g., 'rgba(0, 0, 0, 0.8)') */
  backgroundColor: string;
  /** Text color for titles */
  titleColor: string;
  /** Text color for menu items */
  textColor: string;
  /** Highlight color for selected items */
  highlightColor: string;
  /** Font family for text */
  fontFamily: string;
}

/**
 * Default UI overlay configuration.
 */
export const DEFAULT_UI_CONFIG: UIOverlayConfig = {
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  titleColor: '#ffffff',
  textColor: '#cccccc',
  highlightColor: '#00ffff',
  fontFamily: 'sans-serif',
};

/**
 * Screen transition state for animations.
 */
export interface TransitionState {
  /** Whether a transition is currently active */
  active: boolean;
  /** Type of transition (fade-in, fade-out) */
  type: 'fade-in' | 'fade-out';
  /** Progress of the transition (0 to 1) */
  progress: number;
  /** Duration of the transition in milliseconds */
  duration: number;
  /** Callback to execute when transition completes */
  onComplete?: () => void;
}

/**
 * Actions that can trigger score changes.
 * Includes line clears, T-spins, and drop bonuses.
 */
export type ScoreAction =
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 'tspin'
  | 'tspin-mini'
  | 'tspin-single'
  | 'tspin-double'
  | 'tspin-triple'
  | 'tspin-mini-single'
  | 'tspin-mini-double'
  | 'softdrop'
  | 'harddrop';

/**
 * T-Spin type for line clear results.
 */
export type TSpinType = 'none' | 'mini' | 'full';

/**
 * Result of a line clear operation.
 * Includes information about T-Spins for scoring purposes.
 */
export interface LineClearResult {
  /** Number of lines cleared (0-4) */
  linesCleared: number;
  /** Type of T-Spin (if any) */
  tspinType: TSpinType;
  /** Human-readable description of the clear */
  description: string;
}

/**
 * Current game statistics and scoring state.
 */
export interface GameStats {
  /** Current score */
  score: number;
  /** Current level (affects drop speed) */
  level: number;
  /** Total lines cleared */
  lines: number;
  /** Current combo count */
  combo: number;
  /** Whether the last clear was a "difficult" clear (Tetris or T-spin) */
  backToBack: boolean;
}

/**
 * Player input actions.
 */
export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'hold'
  | 'pause';

/**
 * Mapping of input actions to keyboard keys.
 * Each action can have multiple key bindings.
 */
export type KeyBindings = Record<InputAction, string[]>;

/**
 * A single event in a replay recording.
 */
export interface ReplayEvent {
  /** Milliseconds since game start */
  timestamp: number;
  /** The action that was performed */
  action: InputAction;
}

/**
 * Complete replay data for a game session.
 */
export interface ReplayData {
  /** Random seed for piece generation */
  seed: number;
  /** Recorded input events */
  events: ReplayEvent[];
  /** Final score achieved */
  finalScore: number;
  /** Final level reached */
  finalLevel: number;
  /** Total lines cleared */
  finalLines: number;
  /** ISO 8601 date string */
  date: string;
}

/**
 * Hold state for the Hold queue feature.
 */
export interface HoldState {
  /** The held tetromino type (null if empty) */
  heldPiece: TetrominoType | null;
  /** Whether hold has been used this turn (reset on piece lock) */
  holdUsed: boolean;
}

/**
 * Entry in the high score leaderboard.
 */
export interface HighScoreEntry {
  /** Player name */
  name: string;
  /** Score achieved */
  score: number;
  /** Level reached */
  level: number;
  /** Lines cleared */
  lines: number;
  /** ISO 8601 date string */
  date: string;
}

/**
 * Canvas 2D rendering context, nullable for safety checks.
 */
export type RenderingContext = CanvasRenderingContext2D | null;

/**
 * Complete game configuration.
 */
export interface GameConfig {
  /** Canvas and rendering settings */
  canvas: {
    /** Canvas width in pixels */
    width: number;
    /** Canvas height in pixels */
    height: number;
    /** Size of each cell in pixels */
    cellSize: number;
  };
  /** Timing settings for game mechanics */
  timing: {
    /** Lock delay in milliseconds before piece locks */
    lockDelay: number;
    /** Delayed Auto Shift - initial delay before auto-repeat */
    das: number;
    /** Auto Repeat Rate - delay between auto-repeat moves */
    arr: number;
  };
  /** Scoring multipliers */
  scoring: {
    /** Points per cell for soft drop */
    softDropMultiplier: number;
    /** Points per cell for hard drop */
    hardDropMultiplier: number;
  };
}

/**
 * Default game configuration following Tetris Guideline.
 */
export const DEFAULT_CONFIG: GameConfig = {
  canvas: {
    width: 400,
    height: 600,
    cellSize: 24,
  },
  timing: {
    lockDelay: 500,
    das: 170,
    arr: 50,
  },
  scoring: {
    softDropMultiplier: 1,
    hardDropMultiplier: 2,
  },
};

/**
 * Standard board configuration per Tetris Guideline.
 */
export const BOARD_CONFIG: BoardConfig = {
  width: 10,
  height: 20,
  bufferHeight: 4,
};
