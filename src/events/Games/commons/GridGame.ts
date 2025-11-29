export type IGridGameResult = {
  draw: boolean;
  winner: string | false;
  cells: string[] | false;
};

export abstract class GridGame {
  constructor(player1: string, player2: string) {
    this.player1 = player1;
    this.player2 = player2;
    this.turn = player1;
  }
  protected player1: string;
  protected player2: string;
  protected turn: string;
  protected cells: Record<string, string | false>;
  protected locked: boolean;
  protected reloadRequestedBy: string[] = [];

  protected checkPlay(player: string, cell: string) {
    if (player !== this.player1 && player !== this.player2) {
      return {
        error: 'Invalid player',
        message: 'joueur invalide',
        result: false,
      };
    }
    if (player != this.turn) {
      return {
        error: 'Wrong turn',
        message: "Ce n'est pas votre tour!",
        result: false,
      };
    }
    if (!this.cells.hasOwnProperty(cell)) {
      return {
        error: 'Wrong cell name',
        message: "Cette case n'existe pas",
        result: false,
      };
    }
    if (this.cells[cell]) {
      return {
        error: 'Already played',
        message: 'case déjà jouée!',
        result: false,
      };
    }
    if (this.locked) {
      return {
        error: 'Game locked',
        message: 'Partie terminée, en attente de rechargement',
        result: false,
      };
    }
  }
  protected switchTurn() {
    this.turn = this.turn === this.player1 ? this.player2 : this.player1;
  }
  protected endTurn(
    result: IGridGameResult | false,
    tokenToReturn: string,
    cell: string,
  ) {
    this.turn = this.turn === this.player1 ? this.player2 : this.player1;
    this.locked = result !== false;

    // Retourner la réponse
    return {
      message: 'fin du tour',
      turn: this.locked ? undefined : this.turn,
      token: tokenToReturn,
      cellToDraw: cell,
      result: result,
    };
  }

  public getTurn() {
    return this.turn;
  }
  public getOpponent(user: string) {
    return this.player1 == user ? this.player2 : this.player1;
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
}
