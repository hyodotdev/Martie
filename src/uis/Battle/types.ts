import type {FunctionReturnType} from 'convex/server';
import type {api} from '../../../convex/_generated/api';

export type BattleRoom = NonNullable<
  FunctionReturnType<typeof api.battle.queries.getRoom>
>;
export type BattlePlayer = NonNullable<BattleRoom['host']>;
export type BattleRound = NonNullable<BattleRoom['round']>;
