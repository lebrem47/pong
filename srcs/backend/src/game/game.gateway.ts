import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { retry } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/common/auth/auth.service';
import { UserStatus } from 'src/common/user/entities/user.entity';
import { UserService } from 'src/common/user/user.service';
import { GameResultService } from 'src/game-result/game-result.service';
import { ConnectGameDto } from './dto/connect-game.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { GameCreatedDto } from './dto/game-connected.dto';
import { GameEntity, GameType, MoveDirectionEnum } from './entities/game.entity';

export interface SocketWithData extends Socket {
  data: {
    id: number;
    name: string;
    game?: GameEntity;
    playerNumber?: number;
  }
}

@WebSocketGateway(81)
export class GameGateway {
  @WebSocketServer() server: Server;
  public static games: GameEntity[] = [];
  
  constructor(
    private readonly gameResultService: GameResultService,
    private readonly userService: UserService
    ) {}
  
  @SubscribeMessage('connectToGame')
  connectToGame(
    @MessageBody() dto: ConnectGameDto,
    @ConnectedSocket() client: SocketWithData,
  ) {

    const targetGame = GameGateway.games.find(g => g.id == dto.id);
    client.data.game = targetGame;
    
    console.log(targetGame);
    
    targetGame.connect(client);
    this.userService.update(client.data.id, { status: UserStatus.InGame });

    client.emit('gameConnected', { playersId: targetGame.getPlayersId(), isMM: targetGame.gameType == GameType.MM  });
    targetGame.addEventListener('newFrame', (...args) =>  {
      client.emit('newFrame', ...args);
    });
    targetGame.addEventListener('win', (pl1score, pl2score) => {
      let endedGame = GameGateway.games.findIndex(i => i.id == dto.id);
      if (endedGame != -1) {
        GameGateway.games.splice(endedGame, 1);
      }
    })
    client.on('disconnect', () => {
      if (!this.checkIsPlayer(client)) return;
      this.userService.update(client.data.id, { status: UserStatus.Online });
      const stopedGame = GameGateway.games.find(g => g.id == client.data.game.id);
      if (stopedGame) {
        stopedGame.setPause(true);
        client.data.game.onPlayerDisconnected(client);
        stopedGame.sendToAll('playerDisconnected');
      }
    })
  }

  // Когда игрок ушел из игры
  /*@SubscribeMessage('exit')
  OnPing(@ConnectedSocket() client: SocketWithData) {
    console.log('exit');
    this.userService.update(client.data.id, { status: UserStatus.Online });
  }*/


  @SubscribeMessage('gamePlayerMove')
  playerMove(
    @MessageBody() direction: MoveDirectionEnum,
    @ConnectedSocket() client: SocketWithData,i
  ) {
    const game = client.data.game;
   
    if (!client.data.playerNumber) {
      if (!game) {
        client.emit('error', 'no game selected!');
        return;
      }

      const isReconnected = game.tryReconnect(client);
      if (!isReconnected) {
        client.emit('error', 'You not a player!');
        return;
      }
    }

    game.movePlayer(client.data.playerNumber, direction);
  }


  @SubscribeMessage('playerReady')
  playerReady(
    @ConnectedSocket() client: SocketWithData,
    @MessageBody() settings: number[]
  ) {
    if (!client.data.game) return;
    
    client.data.game.setPlayerReady(client.data.playerNumber, settings);
    client.emit('ready', client.data.playerNumber);
  }

  @SubscribeMessage('selectGameMap')
  selectGameMap(
    @MessageBody() mapId: number,
    @ConnectedSocket() client: SocketWithData
  ) {
    if (!client.data.playerNumber) {
      client.emit('error', 'You not a player!');
      return;
    }
    client.data.game.setMap(mapId);

  }

  @SubscribeMessage('checkIsPlayer')
  checkIsPlayer(
    @ConnectedSocket() client: SocketWithData,
  ) {
    return !! client.data?.game?.isPlyer(client.data.id)
  }

  @SubscribeMessage('connectAsPlayer')
  connectAsPlayer(
    @ConnectedSocket() client: SocketWithData,
  ) {
    const isPlayer = this.checkIsPlayer(client);
    console.log(isPlayer);
    
    if (!isPlayer) return;
  
    client.data.game.tryReconnect(client);
    client.emit('connectedAsPlayer');
  }

  @SubscribeMessage('createGame')
  createGame(
    @MessageBody() dto: CreateGameDto,
    @ConnectedSocket() client: SocketWithData,
  ) {
    const game = new GameEntity(dto.name, this.gameResultService, dto.userId);
    GameGateway.games.push(game);
    
    game.connect(client);
    game.setPlayer(client);
    
    client.data.game = game;

  
    console.log(dto);
    console.log(client.data);
    
    client.emit('gameCreated', {
      game: {
        id: game.id,
      }
    } as GameCreatedDto);
  }
}