import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MorpionGame } from './Morpion/Morpion';
import { Puissance4Game } from './Puissance4/Puissance4';
import { ReversiGame } from './Reversi/Reversi';
import { GridGame, IGridGameResult, IGamePlayer } from './commons/GridGame';
import { PrismaService } from '../../prisma/prisma.service';

interface IGameEvent {
  roomName: string;
  data?: any;
  eventType: 'play' | 'reload' | 'leave' | 'getGameData';
}

const GRACE_PERIOD_MS = 10_000;

@Injectable()
export class GameEventService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger('GamesEventService');
  private readonly games: Map<string, GridGame> = new Map();
  private readonly disconnectTimers: Map<number, NodeJS.Timeout> = new Map();

  private readonly GAMES_REGISTRY: Record<
    string,
    new (player1: IGamePlayer, player2: IGamePlayer) => GridGame
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
    const [p1, p2] = room.map((socket) => socket['user']);
    this.games.set(roomName, new gameClass(p1, p2));
    this.logger.log(
      `Game ${roomName} created between players ${p1.pseudo} and ${p2.pseudo}`,
    );
  }

  annulMatch(roomName: string): void {
    this.games.delete(roomName);
  }

  getOpponentId(roomName: string, userId: number): number | undefined {
    const game = this.games.get(roomName);
    if (!game) return undefined;
    return game.getPlayer1Id() === userId
      ? game.getPlayer2Id()
      : game.getPlayer1Id();
  }

  getGameData(
    roomName: string,
    pseudo: string,
  ):
    | { turn: string; opponent: string; cells: Record<string, string | false> }
    | undefined {
    const game = this.games.get(roomName);
    if (!game) return undefined;
    return {
      turn: game.getTurn(),
      opponent: game.getOpponent(pseudo),
      cells: game.getCells(),
    };
  }

  getActiveRoomForUser(userId: number): string | undefined {
    for (const [roomName, game] of this.games) {
      if (game.getPlayer1Id() === userId || game.getPlayer2Id() === userId) {
        return roomName;
      }
    }
    return undefined;
  }

  hasActiveTimer(userId: number): boolean {
    return this.disconnectTimers.has(userId);
  }

  cancelGraceTimer(userId: number): void {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }
  }

  startGraceTimer(userId: number, server: Server): void {
    const roomName = this.getActiveRoomForUser(userId);
    if (!roomName) return;
    const game = this.games.get(roomName);
    const timer = setTimeout(async () => {
      if (!this.games.has(roomName)) {
        this.disconnectTimers.delete(userId);
        return;
      }
      this.disconnectTimers.delete(userId);
      const gameName = roomName.split('_')[0];
      const opponentId =
        game.getPlayer1Id() === userId
          ? game.getPlayer2Id()
          : game.getPlayer1Id();
      this.games.delete(roomName);
      await this.prisma.gameMatch.create({
        data: { game: gameName, winnerId: opponentId, loserId: userId },
      });
      server.to(roomName).emit('game', { eventType: 'leave' });
      server.socketsLeave(roomName);
      this.logger.log(
        `Game ${roomName} — forfeit after grace period for userId ${userId}`,
      );
    }, GRACE_PERIOD_MS);
    this.disconnectTimers.set(userId, timer);
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
      : undefined;
    if (!result) {
      socket.emit('game', {
        eventType: data.eventType,
        error: 'Not Found',
        message: 'Aucune partie enregistrée',
        code: 404,
      });
      return;
    }
    socket.emit('game', { eventType: data.eventType, result });
  }

  private async handleLeave(socket: Socket, server: Server, data: IGameEvent) {
    const game = this.games.get(data.roomName);
    // Cancel any active grace timer for either player before processing leave
    if (game) {
      this.cancelGraceTimer(game.getPlayer1Id());
      this.cancelGraceTimer(game.getPlayer2Id());
    }
    this.games.delete(data.roomName);
    this.logger.log(`Game ${data.roomName} closed by ${socket['user'].pseudo}`);
    const opponentSocket = (await server.in(data.roomName).fetchSockets()).find(
      (s) => s['user'].pseudo !== socket['user'].pseudo,
    );
    server.socketsLeave(data.roomName);
    opponentSocket?.emit('game', { eventType: 'leave' });
    if (game && !game.isLocked()) {
      const gameName = data.roomName.split('_')[0];
      const leaverId = socket['user'].id;
      const winnerId =
        game.getPlayer1Id() === leaverId
          ? game.getPlayer2Id()
          : game.getPlayer1Id();
      await this.prisma.gameMatch.create({
        data: { game: gameName, winnerId, loserId: leaverId },
      });
    }
  }

  private async handlePlay(
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
    if (result?.result && result.result !== false) {
      await this.saveMatch(data.roomName, game, result.result);
    }
  }

  private async saveMatch(
    roomName: string,
    game: GridGame,
    result: IGridGameResult,
  ) {
    // Cancel any active grace timer — game ended normally
    this.cancelGraceTimer(game.getPlayer1Id());
    this.cancelGraceTimer(game.getPlayer2Id());
    const gameName = roomName.split('_')[0];
    const player1Id = game.getPlayer1Id();
    const player2Id = game.getPlayer2Id();
    const player1Pseudo = game.getPlayer1().pseudo;
    if (result.draw) {
      await this.prisma.gameMatch.create({
        data: { game: gameName, draw: true },
      });
      return;
    }
    const winnerId = result.winner === player1Pseudo ? player1Id : player2Id;
    const loserId = result.winner === player1Pseudo ? player2Id : player1Id;
    await this.prisma.gameMatch.create({
      data: { game: gameName, winnerId, loserId },
    });
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
