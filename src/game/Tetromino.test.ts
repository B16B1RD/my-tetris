import { describe, it, expect } from 'vitest';
import {
  Tetromino,
  TETROMINO_COLORS,
  TETROMINO_DEFS,
  ALL_TETROMINO_TYPES,
} from './Tetromino.ts';
import type { TetrominoType } from '../types/index.ts';

describe('TETROMINO_COLORS', () => {
  it('should define colors for all 7 tetromino types', () => {
    expect(Object.keys(TETROMINO_COLORS)).toHaveLength(7);
    ALL_TETROMINO_TYPES.forEach((type) => {
      expect(TETROMINO_COLORS[type]).toBeDefined();
      expect(typeof TETROMINO_COLORS[type]).toBe('string');
    });
  });

  it('should have valid CSS color values', () => {
    Object.values(TETROMINO_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('TETROMINO_DEFS', () => {
  it('should define all 7 tetromino types', () => {
    expect(Object.keys(TETROMINO_DEFS)).toHaveLength(7);
  });

  it.each(ALL_TETROMINO_TYPES)(
    'should have 4 rotation states for %s',
    (type) => {
      expect(TETROMINO_DEFS[type].shapes).toHaveLength(4);
    }
  );

  it.each(ALL_TETROMINO_TYPES)(
    'should have 4x4 matrices for %s',
    (type) => {
      TETROMINO_DEFS[type].shapes.forEach((shape) => {
        expect(shape).toHaveLength(4);
        shape.forEach((row) => {
          expect(row).toHaveLength(4);
        });
      });
    }
  );

  it.each(ALL_TETROMINO_TYPES)(
    'should have exactly 4 filled cells for %s',
    (type) => {
      TETROMINO_DEFS[type].shapes.forEach((shape) => {
        const filledCount = shape.flat().filter((cell) => cell === 1).length;
        expect(filledCount).toBe(4);
      });
    }
  );
});

describe('Tetromino class', () => {
  describe('constructor', () => {
    it('should create tetromino with default position', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.type).toBe('T');
      expect(tetromino.position).toEqual({ x: 3, y: 0 });
      expect(tetromino.rotation).toBe(0);
    });

    it('should create tetromino with custom position', () => {
      const tetromino = new Tetromino('I', { x: 5, y: 2 });
      expect(tetromino.position).toEqual({ x: 5, y: 2 });
    });

    it('should set correct color based on type', () => {
      ALL_TETROMINO_TYPES.forEach((type) => {
        const tetromino = new Tetromino(type);
        expect(tetromino.color).toBe(TETROMINO_COLORS[type]);
      });
    });
  });

  describe('rotation', () => {
    it('should rotate clockwise through all 4 states', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.rotation).toBe(0);

      tetromino.rotateClockwise();
      expect(tetromino.rotation).toBe(1);

      tetromino.rotateClockwise();
      expect(tetromino.rotation).toBe(2);

      tetromino.rotateClockwise();
      expect(tetromino.rotation).toBe(3);

      tetromino.rotateClockwise();
      expect(tetromino.rotation).toBe(0);
    });

    it('should rotate counter-clockwise through all 4 states', () => {
      const tetromino = new Tetromino('T');
      expect(tetromino.rotation).toBe(0);

      tetromino.rotateCounterClockwise();
      expect(tetromino.rotation).toBe(3);

      tetromino.rotateCounterClockwise();
      expect(tetromino.rotation).toBe(2);

      tetromino.rotateCounterClockwise();
      expect(tetromino.rotation).toBe(1);

      tetromino.rotateCounterClockwise();
      expect(tetromino.rotation).toBe(0);
    });

    it('should set rotation directly', () => {
      const tetromino = new Tetromino('T');
      tetromino.setRotation(2);
      expect(tetromino.rotation).toBe(2);
    });

    it('should set rotation to boundary values', () => {
      const tetromino = new Tetromino('T');

      // Test minimum boundary
      tetromino.setRotation(0);
      expect(tetromino.rotation).toBe(0);

      // Test maximum boundary
      tetromino.setRotation(3);
      expect(tetromino.rotation).toBe(3);
    });
  });

  describe('movement', () => {
    it('should move by delta', () => {
      const tetromino = new Tetromino('T', { x: 5, y: 5 });

      tetromino.move(1, 0);
      expect(tetromino.position).toEqual({ x: 6, y: 5 });

      tetromino.move(-2, 1);
      expect(tetromino.position).toEqual({ x: 4, y: 6 });
    });

    it('should set position directly', () => {
      const tetromino = new Tetromino('T');
      tetromino.setPosition({ x: 7, y: 10 });
      expect(tetromino.position).toEqual({ x: 7, y: 10 });
    });

    it('should return copy of position (immutable)', () => {
      const tetromino = new Tetromino('T', { x: 5, y: 5 });
      const pos = tetromino.position;
      pos.x = 100;
      expect(tetromino.position.x).toBe(5);
    });
  });

  describe('shape', () => {
    it('should return correct shape for rotation state', () => {
      const tetromino = new Tetromino('T');

      expect(tetromino.shape).toEqual(TETROMINO_DEFS.T.shapes[0]);

      tetromino.rotateClockwise();
      expect(tetromino.shape).toEqual(TETROMINO_DEFS.T.shapes[1]);
    });
  });

  describe('getCells', () => {
    it('should return correct cell positions for T at spawn', () => {
      const tetromino = new Tetromino('T', { x: 0, y: 0 });
      const cells = tetromino.getCells();

      expect(cells).toHaveLength(4);
      // T-piece spawn state: middle top, left/center/right of second row
      expect(cells).toContainEqual({ x: 1, y: 0 }); // Top center
      expect(cells).toContainEqual({ x: 0, y: 1 }); // Left
      expect(cells).toContainEqual({ x: 1, y: 1 }); // Center
      expect(cells).toContainEqual({ x: 2, y: 1 }); // Right
    });

    it('should return correct cell positions for I at spawn', () => {
      const tetromino = new Tetromino('I', { x: 0, y: 0 });
      const cells = tetromino.getCells();

      expect(cells).toHaveLength(4);
      // I-piece spawn state: horizontal line in row 1
      expect(cells).toContainEqual({ x: 0, y: 1 });
      expect(cells).toContainEqual({ x: 1, y: 1 });
      expect(cells).toContainEqual({ x: 2, y: 1 });
      expect(cells).toContainEqual({ x: 3, y: 1 });
    });

    it('should offset cells based on position', () => {
      const tetromino = new Tetromino('O', { x: 5, y: 10 });
      const cells = tetromino.getCells();

      expect(cells).toHaveLength(4);
      // O-piece: 2x2 square offset by position
      expect(cells).toContainEqual({ x: 6, y: 10 });
      expect(cells).toContainEqual({ x: 7, y: 10 });
      expect(cells).toContainEqual({ x: 6, y: 11 });
      expect(cells).toContainEqual({ x: 7, y: 11 });
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const original = new Tetromino('J', { x: 3, y: 5 });
      original.setRotation(2);

      const clone = original.clone();

      expect(clone.type).toBe(original.type);
      expect(clone.position).toEqual(original.position);
      expect(clone.rotation).toBe(original.rotation);

      // Verify independence
      clone.move(1, 1);
      clone.rotateClockwise();

      expect(original.position).toEqual({ x: 3, y: 5 });
      expect(original.rotation).toBe(2);
    });
  });
});

describe('ALL_TETROMINO_TYPES', () => {
  it('should contain exactly 7 types', () => {
    expect(ALL_TETROMINO_TYPES).toHaveLength(7);
  });

  it('should contain all standard types', () => {
    const expected: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    expected.forEach((type) => {
      expect(ALL_TETROMINO_TYPES).toContain(type);
    });
  });
});
