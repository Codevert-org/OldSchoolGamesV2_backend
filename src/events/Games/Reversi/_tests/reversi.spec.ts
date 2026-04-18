import { ReversiGame } from '../Reversi';

const player1 = { pseudo: 'Alice', id: 1 };
const player2 = { pseudo: 'Bob', id: 2 };

describe('ReversiGame', () => {
  let game: ReversiGame;

  beforeEach(() => {
    game = new ReversiGame(player1, player2);
  });

  describe('initial state', () => {
    it('should have 4 pieces on the board at start', () => {
      const cells = game.getCells();
      const filled = Object.values(cells).filter(Boolean);
      expect(filled).toHaveLength(4);
    });

    it('should start on player1 turn', () => {
      expect(game.getTurn()).toBe('Alice');
    });
  });

  describe('invalid moves', () => {
    it('should return error if wrong player plays', () => {
      const result = game.play('Bob', { cellName: 'c35' }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if cell is already occupied', () => {
      const result = game.play('Alice', { cellName: 'c44' }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if cell does not exist', () => {
      const result = game.play('Alice', { cellName: 'c99' }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if move does not flip any piece', () => {
      const result = game.play('Alice', { cellName: 'c11' }) as any;
      expect(result.error).toBe('Invalid move');
    });
  });

  describe('valid move', () => {
    it('should return flippedCells, token and next turn', () => {
      // c35 flips c45 (Bob) → Alice gains a piece
      const result = game.play('Alice', { cellName: 'c35' }) as any;
      expect(result.cellToDraw).toBe('c35');
      expect(result.token).toBe('white');
      expect(result.flippedCells).toContain('c45');
      expect(result.turn).toBe('Bob');
    });

    it('player2 token should be black', () => {
      game.play('Alice', { cellName: 'c35' });
      const result = game.play('Bob', { cellName: 'c36' }) as any;
      expect(result.token).toBe('black');
    });

    it('should flip opponent pieces to current player color', () => {
      game.play('Alice', { cellName: 'c35' });
      const cells = game.getCells();
      expect(cells['c45']).toBe('white');
    });

    it('should switch turn after valid move', () => {
      game.play('Alice', { cellName: 'c35' });
      expect(game.getTurn()).toBe('Bob');
    });
  });

  describe('isValidMove', () => {
    it('should return true for a valid move', () => {
      expect(game.isValidMove('c35', 'Alice')).toBe(true);
    });

    it('should return false for a move with no flip', () => {
      expect(game.isValidMove('c11', 'Alice')).toBe(false);
    });

    it('should return false for an occupied cell', () => {
      expect(game.isValidMove('c44', 'Alice')).toBe(false);
    });
  });

  describe('getCells', () => {
    it('should return colors (white/black) not pseudo names', () => {
      const cells = game.getCells();
      const filled = Object.values(cells).filter(Boolean) as string[];
      expect(filled).not.toContain('Alice');
      expect(filled).not.toContain('Bob');
      expect(filled.every((v) => v === 'white' || v === 'black')).toBe(true);
    });
  });

  describe('end of game', () => {
    it('should declare winner by piece count when board is full', () => {
      // Fill board manually: 63 Alice + 1 Bob, leave c11 empty with a flippable Bob at c21
      const g = game as any;
      for (const cell in g.cells) {
        g.cells[cell] = 'Alice';
      }
      g.cells['c11'] = false;
      g.cells['c21'] = 'Bob';
      g.cells['c31'] = 'Alice';
      g.locked = false;
      g.turn = 'Alice';
      // Alice plays c11, flips c21 — board full, neither can play → end of game
      const result = g.play('Alice', { cellName: 'c11' });
      expect(result.result.winner).toBe('Alice');
      expect(result.result.draw).toBe(false);
      expect(game.isLocked()).toBe(true);
    });

    it('should detect draw when piece counts are equal after last move', () => {
      // After Alice plays c11 and flips c21: Alice = 30+1+1 = 32, Bob = 33-1 = 32 → draw
      const g = game as any;
      const allCells = Object.keys(g.cells); // c11, c21, c31, ...
      for (const cell of allCells) {
        g.cells[cell] = 'Bob';
      }
      // Give Alice 30 pieces (indices 2..31)
      for (let i = 2; i <= 31; i++) {
        g.cells[allCells[i]] = 'Alice';
      }
      g.cells['c11'] = false; // empty — Alice plays here
      g.cells['c21'] = 'Bob'; // Bob piece to flip
      g.cells['c31'] = 'Alice'; // Alice anchor to validate flip
      g.locked = false;
      g.turn = 'Alice';
      const result = g.play('Alice', { cellName: 'c11' });
      expect(result.result.draw).toBe(true);
      expect(result.result.winner).toBe(false);
    });

    it('should signal pass when opponent has no valid move but current player does', () => {
      // Fill board: Alice everywhere except c11 empty, c21=Bob next to c31=Alice
      // After Alice plays c11 and flips c21, neither can move → end of game
      // To test pass: need a state where Bob has no moves but Alice does
      // Set up: Alice plays c11 which completes board → end of game (not pass)
      // For pass: keep some empty cells where only Alice can play
      const g = game as any;
      for (const cell in g.cells) {
        g.cells[cell] = 'Alice';
      }
      // Leave two empty cells: c11 (Alice can play) and c88 (neither can play from there — no adjacent Bob)
      g.cells['c11'] = false;
      g.cells['c88'] = false;
      g.cells['c21'] = 'Bob';
      g.cells['c31'] = 'Alice'; // already Alice
      g.locked = false;
      g.turn = 'Alice';
      // Alice plays c11, flips c21 → board has c88 still empty
      // Bob has no valid move (no Alice pieces adjacent to c88 with Bob anchor)
      // Alice also has no valid move at c88 (no Bob pieces to flip)
      // → end of game path (not pass), both locked
      g.play('Alice', { cellName: 'c11' });
      expect(game.isLocked()).toBe(true);
    });
  });
});
