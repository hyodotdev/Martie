/**
 * @name BattleInvite
 *
 * 무료 회원이 대결방을 열기 전에 광고를 한 번 보는 화면
 */
import {useCallback, useRef} from 'react';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import BattleInviteAd from '../src/features/adReward/BattleInviteAd';
import {useCreateBattleRoom} from '../src/hooks/useBattleInvite';

export default function BattleInvitePage(): JSX.Element {
  const {rematchOf} = useLocalSearchParams<{rematchOf?: string}>();
  const router = useRouter();
  const createBattleRoom = useCreateBattleRoom();
  const didStartRef = useRef(false);

  const handleAdDone = useCallback(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    void createBattleRoom(rematchOf || undefined).then((code) => {
      if (code) {
        router.replace({pathname: '/battle/[code]', params: {code}});
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/battles');
      }
    });
  }, [createBattleRoom, rematchOf, router]);

  return (
    <>
      <Stack.Screen options={{headerShown: false}} />
      <BattleInviteAd onDone={handleAdDone} />
    </>
  );
}
