type IMorpionResult = {
  draw: boolean;
  winner: string | false;
  cells: string[] | false;
};

export class MorpionGame {
  constructor(player1: string, player2: string) {
    this.player1 = player1;
    this.player2 = player2;
    this.turn = player1;
  }
  private player1: string;
  private player2: string;
  private readonly token = new Map([
    ['player1', 'X'],
    ['player2', 'O'],
  ]);
  private turn: string;
  private cells: {
    c11: string | false;
    c12: string | false;
    c13: string | false;
    c21: string | false;
    c22: string | false;
    c23: string | false;
    c31: string | false;
    c32: string | false;
    c33: string | false;
  } = {
    c11: false,
    c12: false,
    c13: false,
    c21: false,
    c22: false,
    c23: false,
    c31: false,
    c32: false,
    c33: false,
  };
  private reloadRequestedBy: string[] = [];
  private locked: boolean = false;
  public play(player: string, cell: string) {
    let result: IMorpionResult | false = false;
    if (player !== this.player1 && player !== this.player2) {
      return {
        error: 'Invalid player',
        message: 'joueur invalide',
        result,
      };
    }
    if (player != this.turn) {
      return {
        error: 'Wrong turn',
        message: "Ce n'est pas votre tour!",
        result,
      };
    }
    if (!this.cells.hasOwnProperty(cell)) {
      return {
        error: 'Wrong cell name',
        message: "Cette case n'existe pas",
        result,
      };
    }
    if (this.cells[cell]) {
      return {
        error: 'Already played',
        message: 'case déjà jouée!',
        result,
      };
    }
    if (this.locked) {
      return {
        error: 'Game locked',
        message: 'Partie terminée, en attente de rechargement',
        result,
      };
    }
    //* Fin de levée des erreurs, coup valide
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
      if (this.cells.hasOwnProperty(vectorCell)) validvectors.push(vector);
    }
    for (const testedVector of validvectors) {
      if (this.cells['c' + (cellNumber + testedVector)] == player) {
        if (
          this.cells.hasOwnProperty('c' + (cellNumber - testedVector)) &&
          this.cells['c' + (cellNumber - testedVector)] == player
        ) {
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
    // Tester match nul
    const playbleCells = [];
    for (const cell in this.cells) {
      if (!this.cells[cell]) playbleCells.push(cell);
    }
    if (playbleCells.length === 0) {
      result = { draw: true, winner: false, cells: false };
    }
    //fin du tour, changer de joueur
    this.turn = this.turn === this.player1 ? this.player2 : this.player1;
    if (result !== false) {
      this.locked = true;
    }
    // Retourner la réponse
    return {
      message: 'fin de this.play',
      turn: this.locked ? undefined : this.turn,
      token: tokenToReturn,
      cellToDraw: cell,
      result: result,
    };
  }
  public requestReload(player: string) {
    if (player !== this.player1 && player !== this.player2) {
      return {
        success: false,
        error: 'invalid player',
        message: 'joueur invalide',
      };
    }
    if (this.reloadRequestedBy.includes(player)) {
      return {
        success: false,
        error: 'reload already requested',
        message: 'Rechargement déjà demandé',
      };
    }
    this.reloadRequestedBy.push(player);
    const success = true;
    const ready = this.reloadRequestedBy.length === 2;
    return {
      success,
      ready,
      requestedBy: this.reloadRequestedBy,
    };
  }
  public getPlayerTurn() {
    return this.turn;
  }
}
