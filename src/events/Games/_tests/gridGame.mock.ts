import { GridGame, IGamePlayer } from '../commons/GridGame';

export class MockGridGame extends GridGame {
  constructor(player1: IGamePlayer, player2: IGamePlayer) {
    super(player1, player2);
    this.cells = { c11: false, c12: false, c21: false, c22: false };
    this.locked = false;
  }

  public play(player: string, data: { cellName: string }) {
    const check = this.checkPlay(player, data.cellName);
    if (!check.success) return check;
    this.cells[data.cellName] = player;
    return this.endTurn(false, player, data.cellName);
  }

  public exposeCheckPlay(player: string, cell: string) {
    return this.checkPlay(player, cell);
  }

  public exposeSwitchTurn() {
    return this.switchTurn();
  }

  public lockGame() {
    this.locked = true;
  }

  public setCellValue(cell: string, value: string | false) {
    this.cells[cell] = value;
  }
}
