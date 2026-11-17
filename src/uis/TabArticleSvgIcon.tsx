import React from 'react';
import Svg, {Path} from 'react-native-svg';
import {styled} from 'kstyled';

type Props = {
  strokeColor?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  fillColor?: string;
};

export default function TabArticleSvgIcon({
  strokeColor = '#C8C7BF',
  strokeWidth = 3,
  width = 36,
  height = 36,
  fillColor = 'none',
}: Props): JSX.Element {
  return (
    <Container>
      <Svg width={width} height={height} viewBox="0 0 36 36" fill="none">
        <Path
          d="M8 6h20c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fillColor}
        />
        <Path
          d="M10 12h16"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d="M10 17h16"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d="M10 22h10"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
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
