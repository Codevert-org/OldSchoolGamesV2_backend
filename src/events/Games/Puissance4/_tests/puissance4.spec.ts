import { Puissance4Game } from '../Puissance4';

const player1 = { pseudo: 'Alice', id: 1 };
const player2 = { pseudo: 'Bob', id: 2 };

const playSequence = (
  g: Puissance4Game,
  moves: Array<{ player: string; col: number }>,
) => {
  for (const move of moves) {
    g.play(move.player, { col: move.col });
  }
};

describe('Puissance4Game', () => {
  let game: Puissance4Game;

  beforeEach(() => {
    game = new Puissance4Game(player1, player2);
  });

  describe('invalid moves', () => {
    it('should return error if column does not exist (0)', () => {
      const result = game.play('Alice', { col: 0 }) as any;
      expect(result.error).toBe('Wrong column name');
    });

    it('should return error if column does not exist (8)', () => {
      const result = game.play('Alice', { col: 8 }) as any;
      expect(result.error).toBe('Wrong column name');
    });

    it('should return error if wrong player plays', () => {
      const result = game.play('Bob', { col: 1 }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if column is full', () => {
      // Fill column 1 (6 rows) with alternating players to avoid a vertical win
      playSequence(game, [
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 1 },
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 1 },
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 1 },
      ]);
      // Column 1 is now full, Alice tries to play there
      const result = game.play('Alice', { col: 1 }) as any;
      expect(result.error).toBe('Column full');
    });
  });

  describe('gravity', () => {
    it('should place piece at bottom of empty column', () => {
      const result = game.play('Alice', { col: 3 }) as any;
      expect(result.cellToDraw).toBe('c36');
    });

    it('should stack pieces correctly', () => {
      game.play('Alice', { col: 3 });
      game.play('Bob', { col: 3 });
      const result = game.play('Alice', { col: 3 }) as any;
      expect(result.cellToDraw).toBe('c34');
    });
  });

  describe('victory detection', () => {
    it('should detect horizontal win', () => {
      // Alice: col 1,2,3,4 — Bob: col 5,5,5
      playSequence(game, [
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 5 },
        { player: 'Alice', col: 2 },
        { player: 'Bob', col: 5 },
        { player: 'Alice', col: 3 },
        { player: 'Bob', col: 5 },
      ]);
      const result = game.play('Alice', { col: 4 }) as any;
      expect(result.result.winner).toBe('Alice');
      expect(result.result.draw).toBe(false);
    });

    it('should detect vertical win', () => {
      // Alice stacks col 1 four times — Bob plays col 2
      playSequence(game, [
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 2 },
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 2 },
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 2 },
      ]);
      const result = game.play('Alice', { col: 1 }) as any;
      expect(result.result.winner).toBe('Alice');
    });

    it('should detect diagonal win', () => {
      // Alice diagonal: c16 → c25 → c34 → c43 (bottom-left to top-right)
      // Prefill col2 ×1, col3 ×2, col4 ×3 using Bob stacked in col4 and col7 as safe filler
      playSequence(game, [
        { player: 'Alice', col: 2 }, // c26 — filler col2
        { player: 'Bob', col: 4 }, // c46 — filler col4
        { player: 'Alice', col: 3 }, // c36 — filler col3
        { player: 'Bob', col: 4 }, // c45 — filler col4
        { player: 'Alice', col: 3 }, // c35 — filler col3
        { player: 'Bob', col: 4 }, // c44 — filler col4
        { player: 'Alice', col: 1 }, // c16 — diagonal start
        { player: 'Bob', col: 7 }, // c76
        { player: 'Alice', col: 2 }, // c25
        { player: 'Bob', col: 7 }, // c75
        { player: 'Alice', col: 3 }, // c34
        { player: 'Bob', col: 7 }, // c74
      ]);
      const result = game.play('Alice', { col: 4 }) as any; // c43
      expect(result.result.winner).toBe('Alice');
    });

    it('should lock game after win', () => {
      playSequence(game, [
        { player: 'Alice', col: 1 },
        { player: 'Bob', col: 5 },
        { player: 'Alice', col: 2 },
        { player: 'Bob', col: 5 },
        { player: 'Alice', col: 3 },
        { player: 'Bob', col: 5 },
      ]);
      game.play('Alice', { col: 4 });
      expect(game.isLocked()).toBe(true);
    });
  });

  describe('anti wrap-around', () => {
    it('should not count alignment across column boundary', () => {
      // Fill right side of col7 and left side of col1 for a wrap test
      // Place Alice at c76 c16 c26 c36 — c76 and c16 should NOT connect
      playSequence(game, [
        { player: 'Alice', col: 7 }, // c76
        { player: 'Bob', col: 4 },
        { player: 'Alice', col: 1 }, // c16
        { player: 'Bob', col: 4 },
        { player: 'Alice', col: 2 }, // c26
        { player: 'Bob', col: 4 },
      ]);
      const result = game.play('Alice', { col: 3 }) as any; // c36 — 3 in a row but not 4, and no wrap
      expect(result.result).toBe(false);
      expect(game.isLocked()).toBe(false);
    });
  });
});
