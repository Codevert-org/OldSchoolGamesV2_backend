import { GridGame } from '../commons/GridGame';
import type { IGridGameResult } from '../commons/GridGame';

// Colonne d'une cellule encodée sous forme numérique (ex: 34 → col 3)
const colOf = (n: number) => Math.floor(n / 10);

// Delta de colonne attendu pour un vecteur donné (horizontal: ±1, vertical: 0)
const expectedColDelta = (v: number) =>
  Math.sign(v) * (Math.abs(v) === 10 ? 0 : 1);

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
      const col = (i % 7) + 1;
      const row = Math.floor(i / 7) + 1;
      return [`c${col}${row}`, false];
    }),
  ) as Record<
    `c${1 | 2 | 3 | 4 | 5 | 6 | 7}${1 | 2 | 3 | 4 | 5 | 6}`,
    string | false
  >;

  public play(player: string, data: { col: number }) {
    const col = data.col;
    if (col < 1 || col > 7) {
      return {
        error: 'Wrong column name',
        message: "Cette colonne n'existe pas",
        result: false,
      };
    }
    let cellName: string;
    for (let i = 6; i >= 1; i--) {
      if (!this.cells[`c${col}${i}`]) {
        cellName = `c${col}${i}`;
        break;
      }
    }
    if (!cellName) {
      return {
        error: 'Column full',
        message: 'Cette colonne est pleine',
        success: false,
        result: false,
      };
    }
    const check = this.checkPlay(player, cellName);
    if (!check.success) {
      return check;
    }

    const tokenToReturn = this.token.get(
      player === this.player1 ? 'player1' : 'player2',
    );
    this.cells[cellName] = player;

    const result =
      this.checkVictory(cellName, player) ||
      (this.checkDraw()
        ? ({ draw: true, winner: false, cells: false } as IGridGameResult)
        : false);

    return this.endTurn(result, tokenToReturn, cellName);
  }

  /**
   * Cherche un alignement de 4 pions ou plus à partir de la cellule jouée.
   * Teste les 8 vecteurs, étend dans les deux directions pour chaque voisin aligné.
   */
  private checkVictory(
    cellName: string,
    player: string,
  ): IGridGameResult | false {
    const cellNumber = Number(cellName.substring(1));

    const validVectors = this.vectors.filter((vector) => {
      const neighborNumber = cellNumber + vector;
      return (
        this.cells.hasOwnProperty(`c${neighborNumber}`) &&
        this.cells[`c${neighborNumber}`] === player &&
        colOf(neighborNumber) - colOf(cellNumber) === expectedColDelta(vector)
      );
    });

    for (const vector of validVectors) {
      const winningCells = [cellName, `c${cellNumber + vector}`];
      // Ici, pour chaque validVector, on a deux pions alignés.
      const forward = this.countAligned(cellNumber, vector, 1, player);
      const backward = this.countAligned(cellNumber, vector, -1, player);
      const aligned = 2 + forward.count + backward.count;

      if (aligned > 3) {
        this.locked = true;
        return {
          draw: false,
          winner: player,
          cells: [...winningCells, ...forward.cells, ...backward.cells],
        };
      }
    }

    return false;
  }

  /**
   * Étend l'alignement depuis cellNumber dans la direction (vector * sign).
   * Retourne le nombre de pions supplémentaires trouvés et leurs noms de cellule.
   * Guard colOf() incluse pour éviter le wrap-around sur les bords de grille.
   */
  private countAligned(
    cellNumber: number,
    vector: number,
    sign: 1 | -1,
    player: string,
  ): { count: number; cells: string[] } {
    const cells: string[] = [];
    let step = 1;
    while (true) {
      const nextNumber = cellNumber + vector * sign * step;
      const prevNumber = nextNumber - vector * sign;
      if (
        this.cells.hasOwnProperty(`c${nextNumber}`) &&
        this.cells[`c${nextNumber}`] === player &&
        colOf(nextNumber) - colOf(prevNumber) ===
          sign * expectedColDelta(vector)
      ) {
        cells.push(`c${nextNumber}`);
        step++;
      } else {
        break;
      }
    }
    return { count: cells.length, cells };
  }

  private checkDraw(): boolean {
    const isDraw = Object.values(this.cells).every((cell) => cell !== false);
    if (isDraw) this.locked = true;
    return isDraw;
  }
}
