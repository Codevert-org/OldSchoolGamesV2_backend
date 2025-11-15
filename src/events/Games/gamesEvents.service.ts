import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MorpionGame } from './Morpion/Morpion';
import { Puissance4Game } from './Puissance4/Puissance4';

interface IGameEvent {
  roomName: string;
  data?: any;
  eventType: 'play' | 'reload' | 'leave' | 'getGameData';
}

@Injectable()
export class GameEventService {
  private logger = new Logger('GamesEventService');
  private games: Map<string, any> = new Map();

  GAMES_REGISTRY: Record<
    string,
    new (player1: string, player2: string) => any
  > = {
    morpion: MorpionGame,
    puissance4: Puissance4Game,
  };

  async handleGameCreation(server: Server, game: string, invitationId: number) {
    const roomName = `${game}_${invitationId}`;
    this.logger.log(`Creating game n°${roomName}`);
    const room = await server.in(roomName).fetchSockets();
    const [player1, player2] = room.map((socket) => socket['user'].pseudo);
    //* choose game based on game
    const gameClass = this.GAMES_REGISTRY[game];
    if (!gameClass) {
      throw new Error(`Game ${game} not found in game registry`);
    }
    this.games.set(roomName, new gameClass(player1, player2));
    this.logger.log(
      `Game ${roomName} created between players ${player1} and ${player2}`,
    );
  }

  handleGameEvent(socket: Socket, server: Server, data: IGameEvent) {
    const game = this.games.get(data.roomName);
    let result: any = null;
    // TODO handle data errors ( !data.roomName )
    if (data.eventType === 'getGameData') {
      if (!game) {
        result = { turn: null, error: 'no game registered' };
      } else {
        result = {
          turn: game.getTurn(),
          opponent: game.getOpponent(socket['user'].pseudo),
        };
        socket.emit('game', { eventType: data.eventType, result });
        return;
      }
    }
    if (data.eventType === 'leave') {
      this.games.delete(data.roomName);
      this.logger.log(
        `Game ${data.roomName} closed by ${socket['user'].pseudo}`,
      );
      //? how to close game :
      // make all Socket instances in the room leave the room
      server.socketsLeave(data.roomName);
    }
    if (data.eventType === 'play') {
      // TODO hangle game.play errors
      result = game.play(socket['user'].pseudo, data);
    }
    if (data.eventType === 'reload') {
      result = game.requestReload(socket['user'].pseudo);
      if (result.ready) {
        this.games.set(
          data.roomName,
          new MorpionGame(game.player2, game.player1),
        );
        result.turn = game.getTurn();
        // TODO notify players about the reload being completed
      }
    }
    server
      .to(data.roomName)
      .emit('game', { eventType: data.eventType, result });
  }
}
