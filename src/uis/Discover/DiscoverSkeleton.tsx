import React from 'react';
import {View} from 'react-native';
import {css} from 'kstyled';
import {useCPK} from 'cpk-ui';
import SkeletonBox from '../Common/SkeletonBox';
import {t} from '../../STRINGS';

export default function DiscoverSkeleton(): JSX.Element {
  const {theme} = useCPK();
  const loadingLabel = t('common.loadingPage', {
    page: t('discover.title'),
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
        padding: 16px 0 40px;
        gap: 16px;
      `}
    >
      {/* Radar chart skeleton */}
      <View
        style={css`
          padding: 16px;
          margin: 0 16px;
          background-color: ${theme.bg.paper};
          border-radius: 16px;
          gap: 12px;
          align-items: center;
        `}
      >
        <SkeletonBox width={180} height={22} borderRadius={6} />
        <SkeletonBox width={200} height={200} borderRadius={100} />
        <View
          style={css`
            flex-direction: row;
            gap: 24px;
          `}
        >
          <View style={css`gap: 6px; align-items: center;`}>
            <SkeletonBox width={80} height={14} borderRadius={4} />
            <SkeletonBox width={100} height={12} borderRadius={4} />
            <SkeletonBox width={90} height={12} borderRadius={4} />
            <SkeletonBox width={95} height={12} borderRadius={4} />
          </View>
          <View style={css`gap: 6px; align-items: center;`}>
            <SkeletonBox width={80} height={14} borderRadius={4} />
            <SkeletonBox width={100} height={12} borderRadius={4} />
            <SkeletonBox width={90} height={12} borderRadius={4} />
            <SkeletonBox width={95} height={12} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Review card skeleton */}
      <View
        style={css`
          margin: 0 16px;
          padding: 16px;
          background-color: ${theme.bg.paper};
          border-radius: 16px;
          gap: 8px;
        `}
      >
        <SkeletonBox width={150} height={18} borderRadius={6} />
        <SkeletonBox width={200} height={14} borderRadius={4} />
      </View>

      {/* Articles skeleton */}
      <View
        style={css`
          gap: 12px;
          padding: 0 16px;
        `}
      >
        <SkeletonBox width={160} height={22} borderRadius={6} />
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={css`
              flex-direction: row;
              gap: 12px;
              padding: 12px;
              background-color: ${theme.bg.paper};
              border-radius: 12px;
            `}
          >
            <SkeletonBox width={72} height={72} borderRadius={10} />
            <View
              style={css`
                flex: 1;
                gap: 6px;
                justify-content: center;
              `}
            >
              <SkeletonBox width={60} height={14} borderRadius={8} />
              <SkeletonBox width="90%" height={16} borderRadius={4} />
              <SkeletonBox width="70%" height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
