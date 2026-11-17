/**
 * @name ProgressBar
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled} from 'kstyled';
import {useCPK} from 'cpk-ui';
import Svg, {Line} from 'react-native-svg';

type Props = {
  progress: number; // 진행률 (0 ~ 100)
  variant?: 'default' | 'striped'; // Variant prop to switch styles
};

function ProgressBar({progress, variant = 'default'}: Props): JSX.Element {
  const {theme} = useCPK();
  return (
    <Container variant={variant}>
      {variant === 'striped' ? (
        <StripedFill progress={progress}>
          <Svg height="100%" width="100%">
            {Array.from({length: 10}, (_, i) => (
              <Line
                key={i}
                x1="0%"
                y1={`${i * 10}%`}
                x2="100%"
                y2={`${i * 10 + 5}%`} // 약간의 각도를 줌 (수평에 가까운 스트라이프)
                stroke={theme.role.stripe}
                strokeWidth="2"
                strokeDasharray="5 5" // 점선 효과로 스트라이프 패턴 강화
              />
            ))}
          </Svg>
        </StripedFill>
      ) : (
        <DefaultFill progress={progress} />
      )}
    </Container>
  );
}

export default ProgressBar;

// Container styles for both variants
const Container = styled.View<{variant: 'default' | 'striped'}>`
  flex: 1;
  height: 16px;
  background-color: ${({theme, variant}) =>
    variant === 'striped'
      ? '#E5E5E5'
      : theme.bg.paper}; // 스트라이프용 밝은 회색
  border-radius: 20px;
  overflow: hidden;
`;

const DefaultFill = styled.View<{progress: number}>`
  height: 100%;
  width: ${({progress}) => `${progress}%`};
  background-color: ${({theme}) => theme.bg.progress};
  border-radius: 20px;
`;

// Striped fill (screenshot style)
const StripedFill = styled.View<{progress: number}>`
  height: 100%;
  width: ${({progress}) => `${progress}%`};
  border-radius: 20px;
  overflow: hidden;
`;
