import {Tabs} from 'expo-router/js-tabs';
import {useCPK} from 'cpk-ui';
import {css} from 'kstyled';
import {useSignInRequireModalStore} from '../../src/stores/signInRequireModalStore';
import {useConvexAuth, useQuery} from 'convex/react';
import TabMySvgIcon from '../../src/uis/TabMySvgIcon';
import TabIndexSvgIcon from '../../src/uis/TabIndexSvgIcon';
import TabArticleSvgIcon from '../../src/uis/TabArticleSvgIcon';
import CustomLoadingIndicator from '../../src/uis/CustomLoadingIndicator';
import {api} from '../../convex/_generated/api';
import {useEffect} from 'react';
import {
  logEvent,
  LOG_EVENTS,
  setUser,
  updateUserAnalyticsProperties,
} from '../../src/utils/analytics';
import {useUserStore} from '../../src/stores/userStore';
import {useLocale} from '../../src/hooks/useLocale';

/**
 *
 * 여기 안에 컴포넌트들을 다 넣으면 탭 수가 늘어나기 때문에
 * _Tabs 폴더 안에 화면 안에 필요한 컴포넌트들을 넣어야 합니다.
 */

export default function TabLayout(): JSX.Element {
  const {theme} = useCPK();
  const {setVisible} = useSignInRequireModalStore();
  const {isAuthenticated, isLoading} = useConvexAuth();
  const user = useQuery(api.user.queries.currentUser, {});
  const {isPremium} = useUserStore();
  const {locale} = useLocale();

  // Identify the user (cheap; re-run when identity fields change)
  useEffect(() => {
    if (!user?._id) return;
    setUser({
      displayName: user.displayName || '',
      email: user.email || '',
      id: user._id,
    });
  }, [user?._id, user?.email, user?.displayName]);

  // Update analytics user properties separately so display-name changes
  // don't trigger this effect and language updates reactively.
  useEffect(() => {
    if (!user?._id) return;
    updateUserAnalyticsProperties({
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      featherCount: user.featherCount,
      isPremium,
      language: locale,
    });
  }, [
    user?._id,
    user?.level,
    user?.currentStreak,
    user?.longestStreak,
    user?.featherCount,
    isPremium,
    locale,
  ]);

  if (isLoading) {
    return <CustomLoadingIndicator />;
  }

  return (
    <>
      <Tabs
        initialRouteName="index"
        safeAreaInsets={{bottom: 0}}
        screenOptions={{
          tabBarActiveTintColor: theme.role.primary,
          headerStyle: {backgroundColor: theme.bg.basic},
          headerTitleStyle: {color: theme.text.basic},
          tabBarStyle: [
            css`
              background-color: ${theme.bg.basic};
              height: 60px;
              padding: 0;
            `,
          ],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarShowLabel: false,
            tabBarLabelPosition: 'beside-icon',
            tabBarIcon: ({focused}) => (
              <TabIndexSvgIcon
                width={32}
                height={32}
                strokeColor={
                  focused ? theme.role.primary : theme.text.placeholder
                }
                fillColor={
                  focused ? theme.role.primary : theme.text.placeholder
                }
              />
            ),
          }}
          listeners={{
            tabPress: () => logEvent(LOG_EVENTS.TAB_CHANGED, {tab: 'home'}),
          }}
        />
        <Tabs.Screen
          name="articles"
          options={{
            tabBarShowLabel: false,
            tabBarLabelPosition: 'beside-icon',
            tabBarIcon: ({focused}) => (
              <TabArticleSvgIcon
                width={30}
                height={30}
                strokeColor={
                  focused ? theme.role.primary : theme.text.placeholder
                }
              />
            ),
          }}
          listeners={{
            tabPress: () => logEvent(LOG_EVENTS.TAB_CHANGED, {tab: 'articles'}),
          }}
        />
        <Tabs.Screen
          name="my"
          options={{
            tabBarShowLabel: false,
            tabBarLabelPosition: 'beside-icon',
            tabBarIcon: ({focused}) => (
              <TabMySvgIcon
                width={30}
                height={30}
                strokeColor={
                  focused ? theme.role.primary : theme.text.placeholder
                }
                fillColor={
                  focused ? theme.role.primary : theme.text.placeholder
                }
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                logEvent(LOG_EVENTS.LOGIN_PROMPT_SHOWN, {source: 'my_tab'});
                setVisible(true);
                return;
              }
              logEvent(LOG_EVENTS.TAB_CHANGED, {tab: 'my'});
            },
          }}
        />
      </Tabs>
    </>
  );
}
