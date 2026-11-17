import React from 'react';
import Svg, {Path, Rect, Defs, ClipPath} from 'react-native-svg';
import {styled} from 'kstyled';

type Props = {
  strokeColor?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  fillColor?: string;
};

export default function TabIndexSvgIcon({
  strokeColor = '#C8C7BF',
  strokeWidth = 3,
  width = 36,
  height = 36,
  fillColor = 'none',
}: Props): JSX.Element {
  return (
    <Container>
      <Svg width={width} height={height} viewBox="0 0 36 36" fill="none">
        <Defs>
          <ClipPath id="clip0">
            <Rect x={6} y={6} width={25} height={25} rx={12.5} />
          </ClipPath>
        </Defs>
        <Path
          d="M18 29C16.1013 27.6939 13.9032 26.8616 11.5984 26.5814C9.96368 26.2569 8.29823 26.1035 6.63027 26.1241C6.41685 26.1259 6.20517 26.0864 6.00745 26.0078C5.80974 25.9292 5.62991 25.8132 5.47834 25.6663C5.32677 25.5195 5.20646 25.3448 5.12436 25.1522C5.04226 24.9597 4.99999 24.7532 5 24.5446L5.02951 9.58394C5.02862 9.18252 5.18416 8.79583 5.46452 8.50245C5.74489 8.20908 6.12905 8.03103 6.53892 8.0045C8.23685 7.97152 9.93339 8.11981 11.5984 8.44674C13.9007 8.73703 16.0971 9.5673 18 10.8667M18 29V10.8667M18 29C19.8987 27.6939 22.0968 26.8616 24.4016 26.5814C26.0363 26.2569 27.7018 26.1035 29.3697 26.1241C29.5832 26.1259 29.7948 26.0864 29.9925 26.0078C30.1903 25.9292 30.3701 25.8132 30.5217 25.6663C30.6732 25.5195 30.7935 25.3448 30.8756 25.1522C30.9577 24.9597 31 24.7532 31 24.5446L30.9691 9.58394C30.97 9.18274 30.8147 8.79624 30.5346 8.5029C30.2545 8.20956 29.8707 8.03136 29.4611 8.0045C27.7632 7.97152 26.0666 8.11981 24.4016 8.44674C22.0993 8.73703 19.9029 9.5673 18 10.8667"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Container>
  );
}

const Container = styled.View`
  align-items: center;
  justify-content: center;
  background-color: transparent;
`;
