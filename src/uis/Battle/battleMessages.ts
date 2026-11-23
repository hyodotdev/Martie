import {BATTLE_STAKE_BULBS} from '../../../convex/battle/logic';
import {t} from '../../STRINGS';

export type BattleErrorReason =
  | 'not_authenticated'
  | 'no_profile'
  | 'invalid_code'
  | 'not_found'
  | 'closed'
  | 'finished'
  | 'started'
  | 'full'
  | 'host_offline'
  | 'insufficient_bulbs'
  | 'opponent_insufficient_bulbs'
  | 'opponent_offline'
  | 'daily_limit'
  | 'no_quizzes'
  | 'not_waiting'
  | 'no_opponent'
  | 'not_playing'
  | 'not_in_round'
  | 'not_your_turn'
  | 'too_late'
  | 'same_option'
  | 'invalid_option'
  | 'network';

export function battleErrorMessage(reason: BattleErrorReason): string {
  switch (reason) {
    case 'not_authenticated':
      return t('battle.signInToJoin');
    case 'invalid_code':
    case 'not_found':
      return t('battle.errors.notFound');
    case 'closed':
      return t('battle.errors.closed');
    case 'finished':
      return t('battle.errors.finished');
    case 'started':
    case 'not_waiting':
      return t('battle.errors.started');
    case 'full':
      return t('battle.errors.full');
    case 'host_offline':
      return t('battle.errors.hostOffline');
    case 'insufficient_bulbs':
      return t('battle.errors.insufficientBulbs', {count: BATTLE_STAKE_BULBS});
    case 'opponent_insufficient_bulbs':
      return t('battle.errors.opponentInsufficientBulbs');
    case 'opponent_offline':
    case 'no_opponent':
      return t('battle.errors.opponentOffline');
    case 'daily_limit':
      return t('battle.errors.dailyLimit');
    case 'no_quizzes':
      return t('battle.errors.noQuizzes');
    case 'too_late':
    case 'not_in_round':
    case 'not_playing':
      return t('battle.errors.tooLate');
    case 'same_option':
      return t('battle.errors.sameOption');
    case 'not_your_turn':
    case 'invalid_option':
    case 'no_profile':
    case 'network':
      return t('error.tryAgain');
  }
}
