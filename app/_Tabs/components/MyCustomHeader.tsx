/**
 * @name MyCustomHeader
 *
 * My 탭의 헤더 컴포넌트
 */
import React from 'react';
import {useCPK} from 'cpk-ui';
import {css} from 'kstyled';
import {Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDisplayNameModalStore} from '../../../src/stores/displayNameModalState';
import {t} from '../../../src/STRINGS';
import {Typography, Icon} from 'cpk-ui';
import {useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import {toast} from '@backpackapp-io/react-native-toast';
import {useUserStore} from '../../../src/stores/userStore';

export default function CustomHeader(): JSX.Element {
  const user = useQuery(api.user.queries.currentUser, {});
  const {top} = useSafeAreaInsets();
  const {theme} = useCPK();
  const {setVisible} = useDisplayNameModalStore();
  const hasCertifiedBadge = useUserStore((s) => s.hasCertifiedBadge);

  const handleEditDisplayName = () => {
    setVisible(true);
  };

  const handleBadgePress = () => {
    toast(t('purchase.certifiedBadgeToast'));
  };

  const renderLocalizedTexts = (
    localizedText: string,
  ): JSX.Element | JSX.Element[] | null => {
    return localizedText.split('{name}').map((str, index) =>
      index === 0 ? (
        <Typography.Heading3
          key={index}
          numberOfLines={1}
          style={css`
            font-weight: bold;
            color: ${theme.text.disabled};
          `}
        >
          {user?.displayName}
        </Typography.Heading3>
      ) : (
        <Typography.Heading3 key={index} numberOfLines={1} style={css``}>
          {str}
        </Typography.Heading3>
      ),
    );
  };

  return (
    <View
      style={[
        css`
          padding: ${top + 'px'} 16px 0;
          background-color: ${theme.bg.basic};
          height: ${68 + top + 'px'};
          flex-direction: row;
          align-items: center;
          gap: 4px;
          justify-content: space-between;
        `,
      ]}
    >
      <View
        style={css`
          flex-direction: row;
          align-items: center;
          flex: 1;
        `}
      >
        <Text
          numberOfLines={1}
          style={css`
            flex: 1;
          `}
        >
          {renderLocalizedTexts(t('my.userName'))}
        </Text>
      </View>
      <View
        style={css`
          flex-direction: row;
          align-items: center;
          gap: 12px;
        `}
      >
        {hasCertifiedBadge && (
          <Pressable
            accessibilityLabel={t('purchase.certifiedBadgeTitle')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBadgePress}
          >
            <Icon name="ShieldCheck" size={26} color="#1E88E5" />
          </Pressable>
        )}
        <Pressable
          accessibilityLabel={t('common.changeDisplayName')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleEditDisplayName}
        >
          <View
            style={css`
              width: 40px;
              height: 40px;
              border-radius: 20px;
              align-items: center;
              justify-content: center;
              background-color: ${theme.role.primary}1F;
            `}
          >
            <Icon
              name="PencilSimpleLineBold"
              size={24}
              color={theme.role.primary}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
