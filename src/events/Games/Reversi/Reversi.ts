import { GridGame } from '../commons/GridGame';
import type { IGridGameResult } from '../commons/GridGame';

// Colonne d'une cellule encodée sous forme numérique (ex: 34 → col 3)
const colOf = (n: number) => Math.floor(n / 10);

// Delta de colonne attendu pour un vecteur donné (horizontal: ±1, vertical: 0)
const expectedColDelta = (v: number) =>
  Math.sign(v) * (Math.abs(v) === 10 ? 0 : 1);

export class ReversiGame extends GridGame {
  constructor(player1: string, player2: string) {
    super(player1, player2);
    // Position de départ : 4 pions au centre
    this.cells['c44'] = player1;
    this.cells['c55'] = player1;
    this.cells['c45'] = player2;
    this.cells['c54'] = player2;
  }
  private readonly token = new Map([
    ['player1', 'white'],
    ['player2', 'black'],
  ]);
  cells: Record<
    `c${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`,
    string | false
  > = Object.fromEntries(
    Array.from({ length: 64 }, (_, i) => {
      const col = (i % 8) + 1;
      const row = Math.floor(i / 8) + 1;
      return [`c${col}${row}`, false];
    }),
  ) as Record<
    `c${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`,
    string | false
  >;

  public play(player: string, data: { cellName: string }) {
    const cell = data.cellName;
    const check = this.checkPlay(player, cell);
    if (!check.success) {
      return check;
    }

    const cellsToFlip = this.getCellsToFlip(cell, player);
    if (cellsToFlip.length === 0) {
      return {
        error: 'Invalid move',
        message: 'Vous ne pouvez pas jouer ici',
        success: false,
        result: false,
      };
    }

    // Placer le pion et retourner les pions adverses
    this.cells[cell] = player;
    for (const c of cellsToFlip) {
      this.cells[c] = player;
    }

    const tokenToReturn = this.token.get(
      player === this.player1 ? 'player1' : 'player2',
    );

    // Déterminer le prochain tour
    const opponent = player === this.player1 ? this.player2 : this.player1;
    const opponentCanPlay = this.hasValidMove(opponent);

    if (!opponentCanPlay) {
      const currentCanPlay = this.hasValidMove(player);
      if (!currentCanPlay) {
        // Fin de partie : plus aucun coup possible
        this.locked = true;
        return this.buildResult(this.computeResult(), tokenToReturn, cell, cellsToFlip);
      }
      // L'adversaire passe son tour, le joueur courant rejoue
      return this.buildResult(false, tokenToReturn, cell, cellsToFlip, {
        pass: opponent,
        turn: player,
      });
    }

    this.switchTurn();
    return this.buildResult(false, tokenToReturn, cell, cellsToFlip);
  }

  /**
   * Vérifie si un coup est valide sans l'exécuter.
   * Utilisé pour déterminer si un joueur peut jouer.
   */
  public isValidMove(cellName: string, player: string): boolean {
    if (this.cells[cellName] !== false) return false;
    return this.getCellsToFlip(cellName, player).length > 0;
  }

  /**
   * Retourne la liste de toutes les cellules adverses à retourner
   * si le joueur pose un pion en cellName.
   * Une cellule est retournable si elle appartient à l'adversaire et est
   * encadrée entre cellName et un autre pion du joueur sur le même vecteur,
   * sans case vide ni wrap-around entre les deux.
   */
  private getCellsToFlip(cellName: string, player: string): string[] {
    const cellNumber = Number(cellName.substring(1));
    const toFlip: string[] = [];

    for (const vector of this.vectors) {
      const neighborNumber = cellNumber + vector;
      const neighbor = `c${neighborNumber}`;

      // Le voisin doit exister, appartenir à l'adversaire, sans wrap-around
      if (
        !this.cells.hasOwnProperty(neighbor) ||
        this.cells[neighbor] === false ||
        this.cells[neighbor] === player ||
        colOf(neighborNumber) - colOf(cellNumber) !== expectedColDelta(vector)
      ) {
        continue;
      }

      // Suivre le vecteur : collecter les pions adverses jusqu'à trouver un pion allié
      const candidates: string[] = [];
      let step = 1;
      let valid = false;

      while (true) {
        const nextNumber = cellNumber + vector * step;
        const prevNumber = nextNumber - vector;
        const next = `c${nextNumber}`;

        if (
          !this.cells.hasOwnProperty(next) ||
          this.cells[next] === false ||
          colOf(nextNumber) - colOf(prevNumber) !== expectedColDelta(vector)
        ) {
          break;
        }

        if (this.cells[next] === player) {
          valid = true;
          break;
        }

        candidates.push(next);
        step++;
      }

      if (valid) {
        toFlip.push(...candidates);
      }
    }

    return toFlip;
  }

  private hasValidMove(player: string): boolean {
    for (const cell in this.cells) {
      if (this.cells[cell] === false && this.isValidMove(cell, player)) {
        return true;
      }
    }
    return false;
  }

  private computeResult(): IGridGameResult {
    let p1count = 0;
    let p2count = 0;
    for (const cell in this.cells) {
      if (this.cells[cell] === this.player1) p1count++;
      if (this.cells[cell] === this.player2) p2count++;
    }
    if (p1count === p2count) {
      return { draw: true, winner: false, cells: false };
    }
    return {
      draw: false,
      winner: p1count > p2count ? this.player1 : this.player2,
      cells: false,
    };
  }

  /**
   * Variante de endTurn pour Reversi : inclut flippedCells et le cas pass.
   * On surcharge endTurn ici car la réponse Reversi est différente des autres jeux.
   */
  private buildResult(
    result: IGridGameResult | false,
    token: string,
    cell: string,
    flippedCells: string[],
    passInfo?: { pass: string; turn: string },
  ) {
    this.locked = result !== false;
    return {
      turn: this.locked ? undefined : (passInfo?.turn ?? this.turn),
      token,
      cellToDraw: cell,
      flippedCells,
      result: result || undefined,
      pass: passInfo?.pass,
    };
  }
}
