import { GridGame } from '../commons/GridGame';
import type { IGridGameResult } from '../commons/GridGame';

export class Puissance4Game extends GridGame {
  constructor(player1: string, player2: string) {
    super(player1, player2);
  }
  private readonly token = new Map([
    ['player1', 'red'],
    ['player2', 'yellow'],
  ]);
  cells: Record<
    `c${1 | 2 | 3 | 4 | 5 | 6 | 7}${1 | 2 | 3 | 4 | 5 | 6}`,
    string | false
  > = Object.fromEntries(
    Array.from({ length: 42 }, (_, i) => {
      const col = Math.floor(i / 7) + 1;
      const row = (i % 6) + 1;
      return [`c${col}${row}`, false];
    }),
  ) as Record<
    `c${1 | 2 | 3 | 4 | 5 | 6 | 7}${1 | 2 | 3 | 4 | 5 | 6}`,
    string | false
  >;

  public play(player: string, data: { col: number }) {
    const col = data.col;
    // TODO: validate col or throw error
    let result: IGridGameResult | false = false;
    if (col < 1 || col > 7) {
      return {
        error: 'Wrong column name',
        message: "Cette colonne n'existe pas",
        result: false,
      };
    }
    let cellName: string;
    for (let i = 6; i >= 0; i--) {
      if (!this.cells[`c${col}${i}`]) {
        cellName = `c${col}${i}`;
        break;
      }
    }
    this.checkPlay(player, cellName);

    const tokenToReturn = this.token.get(
      player === this.player1 ? 'player1' : 'player2',
    );
    this.cells[cellName] = player;

    /**
     ** Tester victoire ou match nul
     */

    //* établir les vecteurs valides
    const vectors = [-11, -10, -9, +1, +11, +10, +9, -1];
    const cellNumber: number = Number(cellName.substring(1));
    const validvectors = [];

    for (const vector of vectors) {
      const vectorCell = 'c' + (cellNumber + vector);
      if (
        this.cells.hasOwnProperty(vectorCell) &&
        this.cells[vectorCell] == this.turn
      ) {
        validvectors.push(vector);
      }
    }
    //* compter les pions alignés.
    if (validvectors.length > 0) {
      let aligned: number;
      const cellNumber = Number(cellName.substring(1));
      let winningCells: string[];
      for (const vector of validvectors) {
        winningCells = [cellName];
        // Ici, pour chaque validVector, on a deux pions alignés.
        aligned = 2;
        winningCells.push(`c${cellNumber + vector}`);
        while (true) {
          if (
            this.cells.hasOwnProperty(`c${cellNumber + vector * aligned}`) &&
            this.cells[`c${cellNumber + vector * aligned}`] === player
          ) {
            aligned++;
            winningCells.push(`c${cellNumber + vector * aligned}`);
          } else {
            break;
          }
        }
        while (true) {
          if (
            this.cells.hasOwnProperty(`c${cellNumber - vector * aligned}`) &&
            this.cells[`c${cellNumber - vector * aligned}`] === player
          ) {
            aligned++;
            winningCells.push(`c${cellNumber - vector * aligned}`);
          } else {
            break;
          }
        }
        //* si 4 pions, assigner result
        if (aligned > 3) {
          this.locked = true;
          result = {
            draw: false,
            winner: player,
            cells: winningCells,
          };
        }
      }
    }
    //* Si pas de gagnant, tester le match nul
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
    return this.endTurn(result, tokenToReturn, cellName);
  }
}
