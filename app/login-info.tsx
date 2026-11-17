/**
 * @name LoginInfo
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {useMutation, useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import {Button, Icon, Typography, useCPK} from 'cpk-ui';
import {t} from '../src/STRINGS';
import {useAuthActions} from '@convex-dev/auth/react';
import {Stack, useRouter} from 'expo-router';
import {FlashList} from '@shopify/flash-list';
import {Pressable, View} from 'react-native';
import {useAsync} from '../src/hooks/useAsync';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {toast} from '@backpackapp-io/react-native-toast';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useCallback, useEffect} from 'react';
import {flushAnalytics, logScreenView, resetAnalyticsUser} from '../src/utils/analytics';
import {logError} from '../src/utils/error';

const HOME_ROUTE = '/(tabs)' as const;

function SectionHeader() {
  const user = useQuery(api.user.queries.currentUser, {});
  const {theme} = useCPK();

  return (
    <View
      style={css`
        margin: 0 16px;
        padding: 16px 24px;
        border-bottom-width: 1px;
        border-bottom-color: ${theme.role.border};

        gap: 4px;
      `}
    >
      <Typography.Body1
        style={css`
          font-weight: bold;
        `}
      >
        {t('loginInfo.myEmailAddress')}
      </Typography.Body1>
      <Typography.Body1>{user?.email}</Typography.Body1>
    </View>
  );
}

export default function LoginInfo(): JSX.Element {
  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'login-info',
        screen_class: 'LoginInfo',
      });
  }, []);

  const deleteUser = useMutation(api.user.mutations.deleteAccount);
  const {signOut} = useAuthActions();
  const {theme, alertDialog} = useCPK();
  const {replace, dismissAll} = useRouter();
  const completeSignOut = useCallback(async () => {
    try {
      await flushAnalytics();
    } catch (error) {
      logError(error, 'login-info-signout-analytics');
    }

    resetAnalyticsUser();

    try {
      await signOut();
    } catch (error) {
      logError(error, 'login-info-signout');
    }

    dismissAll();
    replace(HOME_ROUTE);
  }, [dismissAll, replace, signOut]);

  const {execute: handleSignOut, loading: isSigningOut} =
    useAsync(completeSignOut);

  const completeWithdraw = useCallback(async () => {
    try {
      await deleteUser();
    } catch (error) {
      logError(error, 'login-info-withdraw');
      toast.error(t('error.tryAgain'));
      return;
    }

    toast.success(t('loginInfo.withdrawSuccess'));
    alertDialog.close();
    await completeSignOut();
  }, [alertDialog, completeSignOut, deleteUser]);

  const {execute: handleWithdraw, loading: isWithdrawing} =
    useAsync(completeWithdraw);
  const isAccountActionBusy = isSigningOut || isWithdrawing;

  type Section = {
    title: string;
    onPress?: () => void;
  };

  const sections: Section[] = [
    {
      title: t('loginInfo.doSignOut'),
      onPress: () => {
        void handleSignOut();
      },
    },
    {
      title: t('loginInfo.withdraw'),
      onPress: () => {
        alertDialog.open({
          showCloseButton: false,
          backdropOpacity: 0.05,
          title: t('loginInfo.withdrawTitle'),
          body: t('loginInfo.withdrawMessage'),
          styles: {
            container: css`
              border-radius: 20px;
              background-color: ${theme.bg.dialog};
            `,
            titleContainer: css`
              justify-content: center;
              align-items: center;
            `,
            title: css`
              font-weight: bold;
              font-size: 18px;
            `,
            body: css`
              text-align: center;
              color: ${theme.role.danger};
              font-size: 16px;
              line-height: 24px;
            `,
          },
          actions: [
            <Button
              color="light"
              hapticFeedback={ImpactFeedbackStyle.Soft}
              onPress={() => alertDialog.close()}
              text={t('common.cancel')}
              styles={{
                text: css`
                  font-weight: bold;
                `,
              }}
              borderRadius={16}
            />,
            <Button
              onPress={handleWithdraw}
              hapticFeedback={ImpactFeedbackStyle.Soft}
              loading={isWithdrawing}
              disabled={isWithdrawing}
              text={t('loginInfo.withdraw')}
              borderRadius={16}
              styles={{
                text: css`
                  font-weight: bold;
                `,
              }}
            />,
          ],
        });
      },
    },
  ];

  const renderSections = ({item}: {item: Section}) => {
    return (
      <Pressable
        onPress={item.onPress}
        disabled={isAccountActionBusy}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityState={{
          busy: isAccountActionBusy,
          disabled: isAccountActionBusy,
        }}
        style={css`
          margin: 0 16px;
          padding: 16px 24px;
          opacity: ${isAccountActionBusy ? 0.5 : 1};
          border-bottom-width: 1px;
          border-bottom-color: ${theme.role.border};
        `}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          `}
        >
          <Typography.Body1>{item.title}</Typography.Body1>
          <Icon name="CaretRightBold" size={24} />
        </View>
      </Pressable>
    );
  };

  return (
    <Container>
      {/* Configure current screen options only; name must be set in a layout route */}
      <Stack.Screen options={{title: ''}} />
      <FlashList
        data={sections}
        ListHeaderComponent={SectionHeader}
        renderItem={renderSections}
      />
      {isSigningOut || isWithdrawing ? <CustomLoadingIndicator /> : null}
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;
