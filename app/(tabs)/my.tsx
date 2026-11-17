/**
 * @name My
 *
 * My 페이지 메인 컴포넌트
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Stack, Redirect} from 'expo-router';
import {useCPK} from 'cpk-ui';
import {useRouter} from 'expo-router';
import {styled} from 'kstyled';
import * as Linking from 'expo-linking';
import * as SystemUI from 'expo-system-ui';
import * as Notifications from 'expo-notifications';
import {useMMKVBoolean} from 'react-native-mmkv';
import {dark, light} from '../../src/theme';
import {Storage} from '../../src/utils/storage';
import {logScreenView} from '../../src/utils/analytics';
import {logError} from '../../src/utils/error';
import {t} from '../../src/STRINGS';
import TabMyMobile from '../_Tabs/TabMy/TabMyMobile';
import TabMyTablet from '../_Tabs/TabMy/TabMyTablet';
import CustomHeader from '../_Tabs/components/MyCustomHeader';
import {useConvexAuth} from 'convex/react';
import {useActionSheet} from '@expo/react-native-action-sheet';
import {useLocale} from '../../src/hooks/useLocale';
import {useUserStore} from '../../src/stores/userStore';
import {useAdConsentStore} from '../../src/stores/adConsentStore';
import {Share} from 'react-native';
import {useQuery, useMutation} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {MARTIE_INVITE_URL_BASE} from '../../src/utils/constants';

const HOME_ROUTE = '/(tabs)' as const;

export type SubSection = {
  title: string;
  onPress: () => void;
};

export type Section =
  | {
      title: string;
      description?: string;
      onPress?: () => void;
      label?: string;
      labelVariant?: 'default' | 'code';
    }
  | {
      title: string;
      description?: string;
      onPress?: () => void;
      isToggle: boolean;
      isOn: boolean;
      label?: string;
      labelVariant?: 'default' | 'code';
    }
  | {
      title: string;
      description?: string;
      isExpandable: boolean;
      subSections: SubSection[];
      label?: string;
      labelVariant?: 'default' | 'code';
    };

export default function My(): JSX.Element {
  const {
    media: {isTablet},
    changeThemeType,
  } = useCPK();
  const {isAuthenticated} = useConvexAuth();
  const [isDarkMode, setIsDarkMode] = useMMKVBoolean(Storage.ThemeType);
  const {navigate} = useRouter();

  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const checkPremium = useUserStore((state) => state.checkPremium);
  const adPrivacyOptionsRequired = useAdConsentStore(
    (state) => state.privacyOptionsRequired,
  );
  const showAdPrivacyOptions = useAdConsentStore(
    (state) => state.showPrivacyOptions,
  );

  const checkNotificationPermission = async (): Promise<void> => {
    const {status} = await Notifications.getPermissionsAsync();
    setHasNotificationPermission(status === 'granted');
  };

  useEffect(() => {
    checkNotificationPermission();
    checkPremium().catch((error) =>
      console.warn('Failed to refresh premium status:', error),
    );

    if (!__DEV__)
      logScreenView({
        screen_name: '(tabs)/my',
        screen_class: isTablet ? 'TabMyTablet' : 'TabMyMobile',
      });
  }, [checkPremium, isTablet]);

  const toggleTheme = useCallback(() => {
    const newThemeType = isDarkMode ? 'light' : 'dark';

    setIsDarkMode(!isDarkMode);

    setTimeout(() => {
      changeThemeType(newThemeType);

      SystemUI.setBackgroundColorAsync(
        newThemeType === 'dark' ? dark.bg.basic! : light.bg.basic!,
      );
    }, 100);
  }, [isDarkMode, setIsDarkMode, changeThemeType]);

  const {showActionSheetWithOptions} = useActionSheet();
  const {locale, setLocale, supportedLocales} = useLocale();
  const isAdmin = useQuery(api.quizSubmission.queries.amIAdmin) ?? false;
  const referralInfo = useQuery(api.referral.queries.getMyReferralInfo);
  const generateReferralCode = useMutation(
    api.referral.mutations.generateReferralCode,
  );
  const [generatedReferralCode, setGeneratedReferralCode] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!isAuthenticated || referralInfo === undefined || referralInfo === null)
      return;
    if (referralInfo.referralCode || generatedReferralCode) return;

    generateReferralCode()
      .then((code) => {
        if (code) setGeneratedReferralCode(code);
      })
      .catch((error) => logError(error, 'generate-referral-code'));
  }, [
    generateReferralCode,
    generatedReferralCode,
    isAuthenticated,
    referralInfo,
  ]);

  const referralCode = referralInfo?.referralCode ?? generatedReferralCode;
  const referralCodeLabel = referralCode?.toUpperCase();
  const shouldShowReferralCodeAsLabel =
    !!referralCodeLabel && referralCodeLabel.length <= 12;
  const referralCountLabel = referralInfo?.referralCount
    ? `${referralInfo.referralCount} ${t('my.friendsInvited')}`
    : undefined;
  const referralDescription = [
    !shouldShowReferralCodeAsLabel && referralCodeLabel
      ? t('referral.codeLabel', {code: referralCodeLabel})
      : undefined,
    referralCountLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleShareReferral = useCallback(async () => {
    try {
      let code = referralInfo?.referralCode ?? generatedReferralCode;
      if (!code) {
        code = await generateReferralCode();
        if (code) setGeneratedReferralCode(code);
      }
      if (!code) return;

      const inviteUrl = `${MARTIE_INVITE_URL_BASE}/${code}?source=referral`;
      await Share.share({
        message: t('referral.shareMessage', {
          code,
          inviteUrl,
        }),
      });
    } catch (err) {
      logError(err, 'share-referral');
    }
  }, [generatedReferralCode, referralInfo?.referralCode, generateReferralCode]);

  const getLanguageName = (localeCode: string): string => {
    switch (localeCode) {
      case 'ko':
        return t('settings.korean');
      case 'en':
        return t('settings.english');
      case 'ja':
        return t('settings.japanese');
      case 'de':
        return t('settings.german');
      case 'es':
        return t('settings.spanish');
      case 'fr':
        return t('settings.french');
      case 'th':
        return t('settings.thai');
      case 'tw':
        return t('settings.traditionalChinese');
      case 'vi':
        return t('settings.vietnamese');
      default:
        return t('settings.english');
    }
  };

  const handleLanguageSelection = (): void => {
    // 현재 선택된 언어를 맨 첫 번째로, 나머지 언어들을 그 다음에 배치
    const currentLanguageName = getLanguageName(locale);
    const otherLocales = supportedLocales.filter((loc) => loc !== locale);
    const otherLanguageNames = otherLocales.map(getLanguageName);

    // 옵션과 실제 locale 코드를 매핑하는 배열
    const localeMapping = [locale, ...otherLocales];

    const options = [
      currentLanguageName,
      ...otherLanguageNames,
      t('common.cancel'),
    ];
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: t('settings.language'),
      },
      (buttonIndex) => {
        if (
          buttonIndex !== undefined &&
          buttonIndex < options.length - 1 // 취소 버튼 제외
        ) {
          const selectedLocale = localeMapping[buttonIndex];
          if (selectedLocale === locale) {
            // 현재 언어를 선택한 경우 변경하지 않음
            return;
          }
          setLocale(selectedLocale);
        }
      },
    );
  };

  const sections: Section[] = [
    {
      title: t('my.purchase'),
      onPress: () => {
        navigate('/purchase');
      },
    },
    {
      title: t('my.reviewKnowledge'),
      onPress: () => {
        navigate('/quiz-results');
      },
    },
    {
      title: t('my.loginInfo'),
      onPress: () => {
        navigate('/login-info');
      },
    },
    {
      title: t('my.quizCreator'),
      description: t('my.quizCreatorDesc'),
      isExpandable: true,
      subSections: [
        {
          title: t('my.submitQuiz'),
          onPress: () => navigate('/submit-quiz'),
        },
        {
          title: t('my.myCreatedQuizzes'),
          onPress: () => navigate('/my-quizzes'),
        },
        ...(isAdmin
          ? [
              {
                title: t('my.reviewSubmittedQuizzes'),
                onPress: () => navigate('/admin-quiz-submissions'),
              },
            ]
          : []),
      ],
    },
    {
      title: t('my.inviteFriends'),
      description: referralDescription || undefined,
      onPress: handleShareReferral,
      label: shouldShowReferralCodeAsLabel ? referralCodeLabel : undefined,
      labelVariant: 'code',
    },
    ...(!referralInfo?.referredBy
      ? [
          {
            title: t('my.enterReferralCode'),
            onPress: () => navigate('/enter-referral-code'),
          },
        ]
      : []),
    {
      title: t('my.alertSettings'),
      onPress: () => Linking.openSettings(),
      isToggle: true,
      isOn: hasNotificationPermission,
    },
    {
      title: t('my.darkMode'),
      onPress: toggleTheme,
      isToggle: true,
      isOn: isDarkMode,
    },
    {
      title: t('my.sendLetterToMartie'),
      onPress: () => {
        navigate('/send-letter');
      },
    },
    {
      title: t('settings.language'),
      onPress: handleLanguageSelection,
      label: getLanguageName(locale),
    },
    ...(adPrivacyOptionsRequired
      ? [
          {
            title: t('my.adPrivacyChoices'),
            onPress: showAdPrivacyOptions,
          },
        ]
      : []),
  ];

  if (!isAuthenticated) {
    return <Redirect href={HOME_ROUTE} />;
  }

  return (
    <Container>
      <Stack.Screen options={{header: () => <CustomHeader />}} />
      {isTablet ? (
        <TabMyTablet sections={sections} />
      ) : (
        <TabMyMobile sections={sections} />
      )}
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;
