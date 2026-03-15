export type IGridGameResult = {
  draw: boolean;
  winner: string | false;
  cells: string[] | false;
};

export type IGamePlayer = {
  pseudo: string;
  id: number;
};

export abstract class GridGame {
  constructor(player1: IGamePlayer, player2: IGamePlayer) {
    this.player1 = player1;
    this.player2 = player2;
    this.turn = player1.pseudo;
  }
  protected player1: IGamePlayer;
  protected player2: IGamePlayer;
  protected turn: string;
  protected cells: Record<string, string | false>;
  protected locked: boolean;
  protected reloadRequestedBy: string[] = [];
  protected vectors: number[] = [-11, -10, -9, +1, +11, +10, +9, -1];

  public abstract play(player: string, data: any): any;

  protected checkPlay(player: string, cell: string) {
    if (this.locked) {
      return {
        error: 'Game locked',
        message: 'Partie terminée, en attente de rechargement',
        success: false,
        result: false,
      };
    }
    if (player !== this.player1.pseudo && player !== this.player2.pseudo) {
      return {
        error: 'Invalid player',
        message: 'joueur invalide',
        success: false,
      };
    }
    if (player != this.turn) {
      return {
        error: 'Wrong turn',
        message: "Ce n'est pas votre tour!",
        success: false,
        result: false,
      };
    }
    if (!this.cells.hasOwnProperty(cell)) {
      return {
        error: 'Wrong cell name',
        message: "Cette case n'existe pas",
        success: false,
        result: false,
      };
    }
    if (this.cells[cell]) {
      return {
        error: 'Already played',
        message: 'case déjà jouée!',
        success: false,
        result: false,
      };
    }
    return { success: true, result: false };
  }
  protected switchTurn() {
    this.turn = this.turn === this.player1.pseudo ? this.player2.pseudo : this.player1.pseudo;
  }
  protected endTurn(
    result: IGridGameResult | false,
    tokenToReturn: string,
    cell: string,
  ) {
    this.turn = this.turn === this.player1.pseudo ? this.player2.pseudo : this.player1.pseudo;
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
  public isLocked() {
    return this.locked;
  }
  public getPlayer1() {
    return this.player1;
  }
  public getPlayer2() {
    return this.player2;
  }
  public getPlayer1Id() {
    return this.player1.id;
  }
  public getPlayer2Id() {
    return this.player2.id;
  }
  public getOpponent(user: string) {
    return this.player1.pseudo === user ? this.player2.pseudo : this.player1.pseudo;
  }
  public getCells() {
    return this.cells;
  }
  public requestReload(player: string) {
    if (player !== this.player1.pseudo && player !== this.player2.pseudo) {
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
