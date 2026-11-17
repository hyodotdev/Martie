/**
 * @name SectionHeader
 *
 * My 탭의 헤더 섹션 컴포넌트
 */
import React from 'react';
import {useCPK, Typography} from 'cpk-ui';
import {css} from 'kstyled';
import {Pressable, View} from 'react-native';
import {Image} from 'expo-image';
import {Href, useRouter} from 'expo-router';
import {IC_TROPHY} from '../../../src/icons';
import {t} from '../../../src/STRINGS';
import {useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';

export default function SectionHeader(): JSX.Element {
  const {theme} = useCPK();
  const router = useRouter();
  const user = useQuery(api.user.queries.currentUser, {});
  const myRank = useQuery(api.rank.queries.getMyRank);

  const rankInfo = myRank
    ? `${myRank.position}${t('common.rank')}`
    : undefined;
  const featherCount = user?.featherCount ?? 0;
  const featherCountLabel =
    featherCount > 0 ? t('feather.count', {count: featherCount}) : undefined;
  const hallOfFameAccessibilityLabel = [
    t('my.hallOfFame'),
    t('my.hallOfFameDescription'),
    user?.displayName,
    rankInfo,
    featherCountLabel,
  ]
    .filter(Boolean)
    .join(', ');

  const renderRankInfo = () => {
    return rankInfo ?? '-';
  };

  return (
    <View
      style={css`
        padding: 16px 24px;
        border-bottom-width: 1px;
        border-bottom-color: ${theme.role.border};
        gap: 16px;
      `}
    >
      {/* 명예의 전당 Title */}
      <Pressable
        accessible={true}
        accessibilityLabel={hallOfFameAccessibilityLabel}
        accessibilityRole="button"
        onPress={() => router.push('/hall-of-fame' as Href)}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 12px;
          `}
        >
          <Image
            source={IC_TROPHY}
            style={css`
              width: 29px;
              height: 29px;
            `}
          />
          <View
            style={css`
              flex: 1;
              gap: 4px;
            `}
          >
            <Typography.Body1
              style={css`
                font-weight: bold;
              `}
            >
              {t('my.hallOfFame')}
            </Typography.Body1>
            <Typography.Body1>{t('my.hallOfFameDescription')}</Typography.Body1>
          </View>
        </View>
        {/* 명예의 전당 리스트 */}
        <View
          style={css`
            margin-top: 12px;
            background-color: ${theme.bg.paper};
            border-radius: 24px;
            padding: 25px 24px;
          `}
        >
          <View
            style={css`
              flex-direction: row;
              justify-content: space-between;
              gap: 12px;
            `}
          >
            <Typography.Body1
              numberOfLines={1}
              style={css`
                flex: 1;
              `}
            >
              {user?.displayName}
            </Typography.Body1>
            <Typography.Body1>{renderRankInfo()}</Typography.Body1>
          </View>
          {(user?.featherCount ?? 0) > 0 && (
            <View
              style={css`
                flex-direction: row;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
              `}
            >
              <Typography.Body2
                style={css`
                  opacity: 0.6;
                `}
              >
                {t('feather.count', {count: user?.featherCount ?? 0})}
              </Typography.Body2>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
