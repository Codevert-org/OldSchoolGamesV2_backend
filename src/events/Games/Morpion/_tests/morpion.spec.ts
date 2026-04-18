import { MorpionGame } from '../Morpion';

const player1 = { pseudo: 'Alice', id: 1 };
const player2 = { pseudo: 'Bob', id: 2 };

const playSequence = (
  g: MorpionGame,
  moves: Array<{ player: string; cell: string }>,
) => {
  for (const move of moves) {
    g.play(move.player, { cellName: move.cell });
  }
};

describe('MorpionGame', () => {
  let game: MorpionGame;

  beforeEach(() => {
    game = new MorpionGame(player1, player2);
  });

  describe('invalid moves', () => {
    it('should return error if wrong player plays', () => {
      const result = game.play('Bob', { cellName: 'c11' }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if cell already played', () => {
      game.play('Alice', { cellName: 'c11' });
      const result = game.play('Bob', { cellName: 'c11' }) as any;
      expect(result.success).toBe(false);
    });

    it('should return error if cell does not exist', () => {
      const result = game.play('Alice', { cellName: 'c99' }) as any;
      expect(result.success).toBe(false);
    });
  });

  describe('valid move', () => {
    it('should place piece and switch turn', () => {
      const result = game.play('Alice', { cellName: 'c11' }) as any;
      expect(result.cellToDraw).toBe('c11');
      expect(result.token).toBe('X');
      expect(game.getTurn()).toBe('Bob');
    });

    it('player2 token should be O', () => {
      game.play('Alice', { cellName: 'c11' });
      const result = game.play('Bob', { cellName: 'c12' }) as any;
      expect(result.token).toBe('O');
    });
  });

  describe('victory detection', () => {
    it('should detect horizontal win — row 1', () => {
      playSequence(game, [
        { player: 'Alice', cell: 'c11' },
        { player: 'Bob', cell: 'c12' },
        { player: 'Alice', cell: 'c21' },
        { player: 'Bob', cell: 'c22' },
      ]);
      const result = game.play('Alice', { cellName: 'c31' }) as any;
      expect(result.result.winner).toBe('Alice');
      expect(result.result.draw).toBe(false);
    });

    it('should detect vertical win — col 1', () => {
      playSequence(game, [
        { player: 'Alice', cell: 'c11' },
        { player: 'Bob', cell: 'c21' },
        { player: 'Alice', cell: 'c12' },
        { player: 'Bob', cell: 'c22' },
      ]);
      const result = game.play('Alice', { cellName: 'c13' }) as any;
      expect(result.result.winner).toBe('Alice');
    });

    it('should detect diagonal win — top-left to bottom-right', () => {
      playSequence(game, [
        { player: 'Alice', cell: 'c11' },
        { player: 'Bob', cell: 'c12' },
        { player: 'Alice', cell: 'c22' },
        { player: 'Bob', cell: 'c13' },
      ]);
      const result = game.play('Alice', { cellName: 'c33' }) as any;
      expect(result.result.winner).toBe('Alice');
    });

    it('should detect diagonal win — top-right to bottom-left', () => {
      playSequence(game, [
        { player: 'Alice', cell: 'c31' },
        { player: 'Bob', cell: 'c11' },
        { player: 'Alice', cell: 'c22' },
        { player: 'Bob', cell: 'c12' },
      ]);
      const result = game.play('Alice', { cellName: 'c13' }) as any;
      expect(result.result.winner).toBe('Alice');
    });

    it('should lock game after win', () => {
      playSequence(game, [
        { player: 'Alice', cell: 'c11' },
        { player: 'Bob', cell: 'c12' },
        { player: 'Alice', cell: 'c21' },
        { player: 'Bob', cell: 'c22' },
      ]);
      game.play('Alice', { cellName: 'c31' });
      expect(game.isLocked()).toBe(true);
    });
  });

  describe('draw detection', () => {
    it('should detect draw when all cells filled with no winner', () => {
      // Board: Alice c11 c21 c32 c13 c23 / Bob c31 c12 c22 c33
      const moves = [
        { player: 'Alice', cell: 'c11' },
        { player: 'Bob', cell: 'c31' },
        { player: 'Alice', cell: 'c21' },
        { player: 'Bob', cell: 'c12' },
        { player: 'Alice', cell: 'c32' },
        { player: 'Bob', cell: 'c22' },
        { player: 'Alice', cell: 'c13' },
        { player: 'Bob', cell: 'c33' },
      ];
      playSequence(game, moves);
      const result = game.play('Alice', { cellName: 'c23' }) as any;
      expect(result.result.draw).toBe(true);
      expect(result.result.winner).toBe(false);
      expect(game.isLocked()).toBe(true);
    });
  });
});
