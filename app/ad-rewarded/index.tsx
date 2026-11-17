/**
 * @name AdRewarded
 *
 * Rewarded ad entry point for every user.
 */
import {useEffect} from 'react';
import {Stack} from 'expo-router';
import {useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import CustomLoadingIndicator from '../../src/uis/CustomLoadingIndicator';
import {t} from '../../src/STRINGS';
import {logEvent} from '../../src/utils/analytics';
import LevelPlayReward from '../../src/features/adReward/LevelPlayReward';

export default function AdRewarded(): JSX.Element {
  const currentUser = useQuery(api.user.queries.currentUser);

  useEffect(() => {
    if (currentUser !== undefined) {
      logEvent('ad_provider_selected', {
        adProvider: 'levelplay',
      });
    }
  }, [currentUser]);

  // Show loading while user data is being fetched
  if (currentUser === undefined) {
    return (
      <>
        <Stack.Screen options={{headerShown: false}} />
        <CustomLoadingIndicator text={t('common.loading')} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{headerShown: false}} />
      <LevelPlayReward />
    </>
  );
}
