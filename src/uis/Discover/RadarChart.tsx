import React from 'react';
import {View} from 'react-native';
import {useCPK} from 'cpk-ui';
import {css} from 'kstyled';
import Svg, {Polygon, Line, Circle, Text as SvgText} from 'react-native-svg';
import {t} from '../../STRINGS';
import {createRadarAccessibilityLabel} from './accessibility';

type CategoryStat = {
  categoryName: string;
  localizedName: string;
  winRate: number; // 0~100
};

type Props = {
  stats: CategoryStat[];
  size?: number;
};

export default function RadarChart({stats, size = 260}: Props): JSX.Element {
  const {theme} = useCPK();

  if (stats.length < 3) return <></>;

  // 최대 8개 카테고리만 표시 (상위 정답률 + 하위 정답률 혼합)
  const displayStats =
    stats.length <= 8
      ? stats
      : [...stats]
          .sort((a, b) => b.winRate - a.winRate)
          .filter((_, i, arr) => i < 4 || i >= arr.length - 4)
          .slice(0, 8);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;
  const n = displayStats.length;
  const angleStep = (2 * Math.PI) / n;

  // 좌표 계산
  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2; // 12시부터 시작
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // 그리드 레벨 (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1];

  // 데이터 폴리곤 포인트
  const dataPoints = displayStats.map((stat, i) => {
    const r = (stat.winRate / 100) * maxR;
    return getPoint(i, Math.max(r, 2)); // 최소 반경
  });
  const dataPointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // 라벨 포인트
  const labelPoints = displayStats.map((_, i) => getPoint(i, maxR + 24));
  const accessibilityLabel = createRadarAccessibilityLabel({
    stats: displayStats,
    title: t('discover.myRadar'),
  });

  return (
    <View
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={css`
        align-items: center;
      `}
    >
      <Svg
        width={size}
        height={size}
        accessible={false}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {/* 그리드 다각형 */}
        {gridLevels.map((level) => {
          const points = Array.from({length: n}, (_, i) => {
            const p = getPoint(i, maxR * level);
            return `${p.x},${p.y}`;
          }).join(' ');

          return (
            <Polygon
              key={`grid-${level}`}
              points={points}
              fill="none"
              stroke={theme.text.placeholder}
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* 축선 */}
        {Array.from({length: n}, (_, i) => {
          const p = getPoint(i, maxR);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={theme.text.placeholder}
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* 데이터 영역 */}
        <Polygon
          points={dataPointsStr}
          fill={theme.role.primary}
          fillOpacity={0.2}
          stroke={theme.role.primary}
          strokeWidth={2}
        />

        {/* 데이터 포인트 */}
        {dataPoints.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={theme.role.primary}
          />
        ))}

        {/* 카테고리 라벨 */}
        {labelPoints.map((p, i) => (
          <SvgText
            key={`label-${i}`}
            x={p.x}
            y={p.y}
            fill={theme.text.basic}
            fontSize={9}
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {displayStats[i].localizedName.length > 6
              ? displayStats[i].localizedName.slice(0, 6) + '..'
              : displayStats[i].localizedName}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
