/**
 * @name CustomHeader
 *
 * 홈 탭의 헤더 컴포넌트
 */
import React, {useCallback} from 'react';
import {Typography, useCPK} from 'cpk-ui';
import {useRouter, useFocusEffect} from 'expo-router';
import {useMMKVBoolean} from 'react-native-mmkv';
import {Storage} from '../../../src/utils/storage';
import {Image} from 'expo-image';
import {IC_WORDMARK, IC_BULB} from '../../../src/icons';
import {t} from '../../../src/STRINGS';
import {css} from 'kstyled';
import {Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {toast} from '@backpackapp-io/react-native-toast';
import {
  MAX_BULB_COUNT,
  REWARDED_BULB_COUNT,
} from '../../../src/utils/constants';
import ButtonMartie from '../../../src/uis/ButtonMartie';
import {useBulbManager} from '../../../src/hooks/useBulbManager';

export default function CustomHeader(): JSX.Element {
  const {top} = useSafeAreaInsets();
  const {navigate} = useRouter();
  const {theme, alertDialog} = useCPK();
  const {bulbCount, isLoading: isBulbLoading} = useBulbManager();
  const [isRewarded, setIsRewarded] = useMMKVBoolean(Storage.IsRewarded);
  const bulbButtonAccessibilityLabel = [
    t('home.chargeBulb'),
    `${bulbCount || 0} ${t('purchase.bulbs')}`,
  ].join(', ');

  // Replace useAppState with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      if (isRewarded) {
        const hasMaxBulbCount = bulbCount && bulbCount >= MAX_BULB_COUNT;

        toast(
          hasMaxBulbCount
            ? t('common.maxBulbReached')
            : t('common.haveEarnedBulb', {
                count: REWARDED_BULB_COUNT,
              }),
          {
            duration: 5000,
            animationType: 'spring',
          },
        );

        setIsRewarded(false);
      }
    }, [bulbCount, isRewarded, setIsRewarded]),
  );

  const handleBulbPress = useCallback(() => {
    const showRewardAd = async () => {
      alertDialog.close();
      navigate('/ad-rewarded');
    };

    alertDialog.open({
      title: t('home.chargeBulb'),
      body: t('home.bulbRechargeInfo'),
      actions: [
        <ButtonMartie
          key="cancel"
          color="light"
          onPress={() => alertDialog.close()}
          text={t('home.exit')}
          style={css`
            height: 48px;
          `}
          borderRadius={16}
        />,
        <ButtonMartie
          key="watch"
          onPress={showRewardAd}
          text={t('home.watchAd')}
          style={css`
            height: 48px;
          `}
          borderRadius={16}
        />,
      ],
    });
  }, [alertDialog, navigate]);

  return (
    <View
      style={css`
        padding: ${top + 'px'} 16px 0;
        background-color: ${theme.bg.basic};
        height: ${68 + top + 'px'};
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      `}
    >
      <Image
        accessibilityElementsHidden={true}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        source={IC_WORDMARK}
        testID="header-wordmark"
        style={css`
          width: 114px;
          height: 46px;
          margin-left: 14px;
        `}
      />
      <Pressable
        accessible={true}
        accessibilityHint={t('home.bulbRechargeInfo')}
        accessibilityLabel={bulbButtonAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{busy: isBulbLoading}}
        style={css`
          margin-top: 3px;
          margin-right: 2px;
          border-radius: 12px;
          padding: 4px;
        `}
        onPress={handleBulbPress}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 4px;
          `}
        >
          <Image
            accessibilityElementsHidden={true}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={IC_BULB}
            testID="header-bulb-icon"
            style={css`
              width: 28px;
              height: 28px;
            `}
          />
          <Typography.Heading5
            style={css`
              color: ${theme.text.basic};
              margin-top: 2px;
            `}
          >
            {bulbCount || 0}
          </Typography.Heading5>
        </View>
      </Pressable>
    </View>
  );
}
