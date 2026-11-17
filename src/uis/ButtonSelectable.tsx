/**
 * @name ButtonSelectable
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {Typography, useCPK} from 'cpk-ui';
import {StyleProp, TextStyle, ViewStyle} from 'react-native';

type Props = {
  text?: string | JSX.Element;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onSelect?: (selected: boolean) => void;
};

export default function ButtonSelectable({
  text,
  selected = false,
  style,
  textStyle,
  onSelect,
}: Props): JSX.Element {
  const {theme} = useCPK();

  return (
    <Container style={style} onPress={() => onSelect?.(!selected)}>
      <ButtonContainer
        style={css`
          ${selected
            ? `
              background-color: ${theme.role.selectedBg};
              border-color: ${theme.role.selectedBorder};
            `
            : `
              background-color: ${theme.role.unselectedBg};
              border-color: ${theme.role.unselectedBg};
            `}
          border-width: 3px;
        `}
      >
        <ContentView>
          {typeof text === 'string' ? (
            <Typography.Body2
              style={[
                css`
                  color: ${theme.text.basic};
                `,
                textStyle,
              ]}
            >
              {text}
            </Typography.Body2>
          ) : (
            text
          )}
        </ContentView>
      </ButtonContainer>
    </Container>
  );
}

const Container = styled.Pressable`
  border-radius: 12px;
`;

const ButtonContainer = styled.View`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 12px;
  border-width: 1px;
`;

const ContentView = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;
