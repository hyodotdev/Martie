import React from 'react';
import {View} from 'react-native';
import {css} from 'kstyled';
import {useCPK} from 'cpk-ui';
import SkeletonBox from '../Common/SkeletonBox';
import {t} from '../../STRINGS';

export default function ArticleListSkeleton(): JSX.Element {
  const {theme} = useCPK();
  const loadingLabel = t('common.loadingPage', {
    page: t('article.title'),
  });

  return (
    <View
      accessible={true}
      accessibilityLabel={loadingLabel}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{busy: true}}
      style={css`
        flex: 1;
        padding-bottom: 20px;
      `}
    >
      {/* Category filter skeleton */}
      <View
        style={css`
          flex-direction: row;
          padding: 8px 16px;
          gap: 8px;
        `}
      >
        {[60, 80, 70, 90, 75].map((w, i) => (
          <SkeletonBox key={i} width={w} height={32} borderRadius={20} />
        ))}
      </View>

      {/* Article cards skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={css`
            margin: 8px 16px;
            border-radius: 16px;
            background-color: ${theme.bg.paper};
            overflow: hidden;
          `}
        >
          <SkeletonBox width="100%" height={180} borderRadius={0} />
          <View
            style={css`
              padding: 14px 16px;
              gap: 8px;
            `}
          >
            <SkeletonBox width={70} height={18} borderRadius={8} />
            <SkeletonBox width="85%" height={20} borderRadius={4} />
            <SkeletonBox width="95%" height={14} borderRadius={4} />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}
