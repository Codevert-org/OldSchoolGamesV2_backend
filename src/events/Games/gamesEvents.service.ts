import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MorpionGame } from './Morpion/Morpion';

interface IGameEvent {
  roomName: string;
  cellName?: string;
  eventType: 'play' | 'reload' | 'leave' | 'getTurn';
}

@Injectable()
export class GameEventService {
  private logger = new Logger('GamesEventService');
  private games: Map<string, any> = new Map();

  async handleGameCreation(client: Socket, server: Server, roomName: string) {
    this.logger.log(`Creating game n°${roomName}`);
    const room = await server.in(roomName).fetchSockets();
    const [player1, player2] = room.map((socket) => socket['user'].pseudo);
    this.games.set(roomName, new MorpionGame(player1, player2));
    this.logger.log(
      `Game n°${roomName} created between players ${player1} and ${player2}`,
    );
  }

  handleGameEvent(socket: Socket, server: Server, data: IGameEvent) {
    const game = this.games.get(data.roomName);
    let result: any = null;
    // TODO handle data errors
    if (data.eventType === 'getTurn') {
      result = { turn: game.getPlayerTurn() };
    }
    if (data.eventType === 'leave') {
      this.games.delete(data.roomName);
      this.logger.log(
        `Game ${data.roomName} closed by ${socket['user'].pseudo}`,
      );
    }
    if (data.eventType === 'play') {
      result = game.play(socket['user'].pseudo, data.cellName);
    }
    if (data.eventType === 'reload') {
      result = game.requestReload(socket['user'].pseudo);
      if (result.ready) {
        this.games.set(
          data.roomName,
          new MorpionGame(game.player1, game.player2),
        );
      }
    }
    server
      .to(data.roomName)
      .emit('game', { eventType: data.eventType, result });
  }
}
