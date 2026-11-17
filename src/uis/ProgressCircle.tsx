import React, {useEffect} from 'react';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Path} from 'react-native-svg';
import {styled} from 'kstyled';
import {useCPK} from 'cpk-ui';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  duration?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ProgressCircle: React.FC<CircularProgressProps> = ({
  percentage = 40,
  size = 28,
  strokeWidth = 4,
  duration = 1000,
}) => {
  const {theme} = useCPK();
  const radius = (size - strokeWidth * 2) / 2;
  const animatedPercentage = useSharedValue(0);

  const createFilledArcPath = (percentage: number) => {
    'worklet';
    const angle = (percentage / 100) * 360;
    const x = size / 2;
    const y = size / 2;

    // 시작점은 항상 12시 방향
    const startX = x;
    const startY = y - radius;

    // 종료점 계산
    const angleRad = (angle - 90) * (Math.PI / 180);
    const endX = x + radius * Math.cos(angleRad);
    const endY = y + radius * Math.sin(angleRad);

    // 큰 원호인지 여부
    const largeArcFlag = angle > 180 ? 1 : 0;

    // 원의 중심점으로부터 시작하는 path를 생성
    return `M ${x} ${y} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  const animatedProps = useAnimatedProps(() => {
    return {
      d: createFilledArcPath(animatedPercentage.value),
    };
  });

  useEffect(() => {
    if (percentage === 0) {
      // 0일 때는 애니메이션 없이 즉시 변경
      animatedPercentage.value = percentage;
    } else {
      // 0이 아닐 때는 애니메이션 적용
      animatedPercentage.value = withTiming(percentage, {duration});
    }
  }, [percentage, duration, animatedPercentage]);

  return (
    <Container>
      <Svg height={size} width={size}>
        {/* 배경 원 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={theme.bg.paper}
          stroke="none"
        />
        {/* 채워지는 부분 */}
        <AnimatedPath
          animatedProps={animatedProps}
          fill={theme.role.primary}
          stroke="none"
        />
      </Svg>
    </Container>
  );
};

const Container = styled.View`
  border-radius: 28px;
  background-color: ${({theme}) => theme.role.border};
`;

export default ProgressCircle;
