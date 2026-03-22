import { MockGridGame } from './gridGame.mock';

const player1 = { pseudo: 'Alice', id: 1 };
const player2 = { pseudo: 'Bob', id: 2 };

describe('GridGame (via MockGridGame)', () => {
  let game: MockGridGame;

  beforeEach(() => {
    game = new MockGridGame(player1, player2);
  });

  describe('getters', () => {
    it('should return player1', () => {
      expect(game.getPlayer1()).toEqual(player1);
    });

    it('should return player2', () => {
      expect(game.getPlayer2()).toEqual(player2);
    });

    it('should return player1 id', () => {
      expect(game.getPlayer1Id()).toBe(1);
    });

    it('should return player2 id', () => {
      expect(game.getPlayer2Id()).toBe(2);
    });

    it('should start on player1 turn', () => {
      expect(game.getTurn()).toBe('Alice');
    });

    it('should not be locked initially', () => {
      expect(game.isLocked()).toBe(false);
    });

    it('should return opponent of player1', () => {
      expect(game.getOpponent('Alice')).toBe('Bob');
    });

    it('should return opponent of player2', () => {
      expect(game.getOpponent('Bob')).toBe('Alice');
    });

    it('should return cells map', () => {
      const cells = game.getCells();
      expect(cells).toHaveProperty('c11');
      expect(cells['c11']).toBe(false);
    });
  });

  describe('checkPlay', () => {
    it('should return success true for valid move', () => {
      const result = game.exposeCheckPlay('Alice', 'c11');
      expect(result.success).toBe(true);
    });

    it('should return error if wrong player turn', () => {
      const result = game.exposeCheckPlay('Bob', 'c11');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wrong turn');
    });

    it('should return error if invalid player', () => {
      const result = game.exposeCheckPlay('Unknown', 'c11');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player');
    });

    it('should return error if cell does not exist', () => {
      const result = game.exposeCheckPlay('Alice', 'c99');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wrong cell name');
    });

    it('should return error if cell already played', () => {
      game.setCellValue('c11', 'Alice');
      const result = game.exposeCheckPlay('Alice', 'c11');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already played');
    });

    it('should return error if game is locked', () => {
      game.lockGame();
      const result = game.exposeCheckPlay('Alice', 'c11');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game locked');
    });
  });

  describe('switchTurn', () => {
    it('should switch from player1 to player2', () => {
      game.exposeSwitchTurn();
      expect(game.getTurn()).toBe('Bob');
    });

    it('should switch back from player2 to player1', () => {
      game.exposeSwitchTurn();
      game.exposeSwitchTurn();
      expect(game.getTurn()).toBe('Alice');
    });
  });

  describe('requestReload', () => {
    it('should return success and not ready on first request', () => {
      const result = game.requestReload('Alice');
      expect(result.success).toBe(true);
      expect(result.ready).toBe(false);
    });

    it('should return ready when both players request', () => {
      game.requestReload('Alice');
      const result = game.requestReload('Bob');
      expect(result.success).toBe(true);
      expect(result.ready).toBe(true);
    });

    it('should return error if player requests reload twice', () => {
      game.requestReload('Alice');
      const result = game.requestReload('Alice');
      expect(result.success).toBe(false);
    });

    it('should return error for invalid player', () => {
      const result = game.requestReload('Unknown');
      expect(result.success).toBe(false);
    });
  });
});
