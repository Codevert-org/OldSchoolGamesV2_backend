import { GridGame } from '../commons/GridGame';
import type { IGridGameResult } from '../commons/GridGame';

export class MorpionGame extends GridGame {
  constructor(player1: string, player2: string) {
    super(player1, player2);
  }
  private readonly token = new Map([
    ['player1', 'X'],
    ['player2', 'O'],
  ]);
  cells: Record<`c${1 | 2 | 3}${1 | 2 | 3}`, string | false> =
    Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => {
        const col = Math.floor(i / 3) + 1;
        const row = (i % 3) + 1;
        return [`c${col}${row}`, false];
      }),
    ) as Record<`c${1 | 2 | 3}${1 | 2 | 3}`, string | false>;

  public play(player: string, data: { cellName: string }) {
    const cell = data.cellName;
    // TODO: validate cellName or throw error
    let result: IGridGameResult | false = false;
    const check = this.checkPlay(player, cell);
    if (!check.success) {
      return check;
    }

    const tokenToReturn = this.token.get(
      player === this.player1 ? 'player1' : 'player2',
    );
    this.cells[cell] = player;
    // Tester victoire
    //établir les cellules valides
    const vectors = [-11, -10, -9, +1, +11, +10, +9, -1];
    const cellNumber: number = Number(cell.substring(1));
    const validvectors = [];
    for (const vector of vectors) {
      const vectorCell = 'c' + (cellNumber + vector);
      if (this.cells.hasOwnProperty(vectorCell)) {
        validvectors.push(vector);
      }
    }
    for (const testedVector of validvectors) {
      if (this.cells['c' + (cellNumber + testedVector)] == player) {
        if (
          this.cells.hasOwnProperty('c' + (cellNumber - testedVector)) &&
          this.cells['c' + (cellNumber - testedVector)] == player
        ) {
          this.locked = true;
          result = {
            draw: false,
            winner: player,
            cells: [
              'c' + (cellNumber - testedVector),
              'c' + cellNumber,
              'c' + (cellNumber + testedVector),
            ],
          };
        }
        if (
          this.cells.hasOwnProperty('c' + (cellNumber + testedVector * 2)) &&
          this.cells['c' + (cellNumber + testedVector * 2)] == player
        ) {
          this.locked = true;
          result = {
            draw: false,
            winner: player,
            cells: [
              'c' + cellNumber,
              'c' + (cellNumber + testedVector),
              'c' + (cellNumber + testedVector * 2),
            ],
          };
        }
      }
    }
    //* Si pas de gagnant, tester match nul

    if (!result) {
      const playbleCells = [];
      for (const cell in this.cells) {
        if (!this.cells[cell]) {
          playbleCells.push(cell);
        }
      }
      if (playbleCells.length === 0) {
        this.locked = true;
        result = { draw: true, winner: false, cells: false };
      }
    }

    //* fin du tour
    return this.endTurn(result, tokenToReturn, cell);
  }
}
