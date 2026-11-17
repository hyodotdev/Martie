/**
 * @name BaseBubble
 */
import {styled, css} from 'kstyled';
import {Typography} from 'cpk-ui';
import {StyleProp, TextStyle, ViewStyle} from 'react-native';

type TailDirection = 'bottom' | 'left';

type Props = {
  text: string | JSX.Element;
  style?: StyleProp<ViewStyle>;
  styles?: {
    container?: ViewStyle;
    text?: TextStyle;
    triangle?: ViewStyle;
  };
  tailDirection?: TailDirection;
};

function BaseBubble({
  text,
  style,
  styles,
  tailDirection = 'bottom',
}: Props): JSX.Element {
  if (tailDirection === 'left') {
    return (
      <SideContainer style={style}>
        <LeftTriangleOuter style={styles?.triangle} />
        <LeftTriangleInner />
        <SideTextContainer style={styles?.container}>
          <Typography.Body1
            style={[
              styles?.text,
              css`
                text-align: center;
                font-weight: bold;
              `,
            ]}
          >
            {text}
          </Typography.Body1>
        </SideTextContainer>
      </SideContainer>
    );
  }

  return (
    <Container style={style}>
      <TextContainer style={styles?.container}>
        <Typography.Body1
          style={[
            styles?.text,
            css`
              text-align: center;
              font-weight: bold;
            `,
          ]}
        >
          {text}
        </Typography.Body1>
      </TextContainer>
      <Triangle style={styles?.triangle} />
    </Container>
  );
}

const Container = styled.View`
  align-items: center;
  height: 152px;
  justify-content: flex-end;
`;

const TextContainer = styled.View`
  min-width: 284px;
  padding: 22px 20px;
  border-radius: 20px;
  border-width: 4px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.bubble};
  justify-content: center;
  align-items: center;
`;

const Triangle = styled.View`
  width: 0;
  height: 0;
  border-left-width: 10px;
  border-right-width: 10px;
  border-top-width: 10px;
  border-left-color: transparent;
  border-right-color: transparent;
  border-top-color: ${({theme}) => theme.role.border};
  margin-top: -1px;
`;

const SideContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const SideTextContainer = styled.View`
  flex: 1;
  padding: 18px 20px;
  border-radius: 18px;
  border-width: 3px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.bubble};
  justify-content: center;
`;

const LeftTriangleOuter = styled.View`
  width: 0;
  height: 0;
  border-top-width: 8px;
  border-bottom-width: 8px;
  border-right-width: 10px;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-right-color: ${({theme}) => theme.role.border};
`;

const LeftTriangleInner = styled.View`
  width: 0;
  height: 0;
  border-top-width: 5px;
  border-bottom-width: 5px;
  border-right-width: 7px;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-right-color: ${({theme}) => theme.bg.bubble};
  margin-right: -3px;
  z-index: 1;
`;

export default BaseBubble;
