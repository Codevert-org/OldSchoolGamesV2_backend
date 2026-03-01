import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MorpionGame } from './Morpion/Morpion';
import { Puissance4Game } from './Puissance4/Puissance4';
import { ReversiGame } from './Reversi/Reversi';
import { GridGame } from './commons/GridGame';

interface IGameEvent {
  roomName: string;
  data?: any;
  eventType: 'play' | 'reload' | 'leave' | 'getGameData';
}

@Injectable()
export class GameEventService {
  private readonly logger = new Logger('GamesEventService');
  private readonly games: Map<string, GridGame> = new Map();

  private readonly GAMES_REGISTRY: Record<
    string,
    new (player1: string, player2: string) => GridGame
  > = {
    morpion: MorpionGame,
    puissance4: Puissance4Game,
    reversi: ReversiGame,
  };

  async handleGameCreation(server: Server, game: string, invitationId: number) {
    const roomName = `${game}_${invitationId}`;
    this.logger.log(`Creating game n°${roomName}`);
    const gameClass = this.GAMES_REGISTRY[game];
    if (!gameClass) {
      throw new Error(`Game ${game} not found in game registry`);
    }
    const room = await server.in(roomName).fetchSockets();
    if (room.length < 2) {
      throw new Error(`Room ${roomName} does not have 2 players`);
    }
    const [player1, player2] = room.map((socket) => socket['user'].pseudo);
    this.games.set(roomName, new gameClass(player1, player2));
    this.logger.log(
      `Game ${roomName} created between players ${player1} and ${player2}`,
    );
  }

  async handleGameEvent(socket: Socket, server: Server, data: IGameEvent) {
    if (!data.roomName) {
      socket.emit('game', {
        eventType: data.eventType,
        error: 'roomName manquant',
      });
      return;
    }
    const game = this.games.get(data.roomName);

    if (data.eventType === 'getGameData') {
      return this.handleGetGameData(socket, data, game);
    }
    if (data.eventType === 'leave') {
      return this.handleLeave(socket, server, data);
    }
    if (data.eventType === 'play') {
      return this.handlePlay(socket, server, data, game);
    }
    if (data.eventType === 'reload') {
      return this.handleReload(socket, server, data, game);
    }
  }

  private handleGetGameData(
    socket: Socket,
    data: IGameEvent,
    game: GridGame | undefined,
  ) {
    const result = game
      ? {
          turn: game.getTurn(),
          opponent: game.getOpponent(socket['user'].pseudo),
          cells: game.getCells(),
        }
      : { turn: null, error: 'no game registered' };
    socket.emit('game', { eventType: data.eventType, result });
  }

  private async handleLeave(socket: Socket, server: Server, data: IGameEvent) {
    this.games.delete(data.roomName);
    this.logger.log(`Game ${data.roomName} closed by ${socket['user'].pseudo}`);
    const opponentSocket = (await server.in(data.roomName).fetchSockets()).find(
      (s) => s['user'].pseudo !== socket['user'].pseudo,
    );
    server.socketsLeave(data.roomName);
    opponentSocket?.emit('game', { eventType: 'leave' });
  }

  private handlePlay(
    socket: Socket,
    server: Server,
    data: IGameEvent,
    game: GridGame | undefined,
  ) {
    if (!game) {
      socket.emit('game', {
        eventType: data.eventType,
        error: 'Partie introuvable',
      });
      return;
    }
    const result = game.play(socket['user'].pseudo, data);
    server
      .to(data.roomName)
      .emit('game', { eventType: data.eventType, result });
  }

  private handleReload(
    socket: Socket,
    server: Server,
    data: IGameEvent,
    game: GridGame | undefined,
  ) {
    if (!game) {
      socket.emit('game', {
        eventType: data.eventType,
        error: 'Partie introuvable',
      });
      return;
    }
    const reloadResult = game.requestReload(socket['user'].pseudo);
    let result: any = reloadResult;
    if (reloadResult.ready) {
      const gameClass = this.GAMES_REGISTRY[data.roomName.split('_')[0]];
      if (!gameClass) {
        throw new Error(
          `Game ${data.roomName.split('_')[0]} not found in game registry`,
        this.games.set(
          data.roomName,
          new gameClass(game.player2, game.player1),
        );
      }
      this.games.set(
        data.roomName,
        new gameClass(game.getPlayer1(), game.getPlayer2()),
      );
      result = {
        ...reloadResult,
        turn: this.games.get(data.roomName).getTurn(),
      };
    }
    server
      .to(data.roomName)
      .emit('game', { eventType: data.eventType, result });
  }
}
