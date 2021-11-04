import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { GameResultService } from './game-result.service';
import { GameResult } from './entities/game-result.entity';

@Resolver(() => GameResult)
export class GameResultResolver {
  constructor(private readonly gameResultService: GameResultService) {}

  @Query(() => [GameResult], { name: 'gameResult' })
  findAll(
    @Args('user_id',{ type: () => Int, nullable: true }) userId: number,
    @Args('take',{ type: () => Int, nullable: true }) take,
    @Args('skip',{ type: () => Int, nullable: true }) skip,
  ) {
    return this.gameResultService.findAll(userId, take, skip);
  }

}
