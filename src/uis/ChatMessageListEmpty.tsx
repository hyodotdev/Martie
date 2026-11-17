/**
 * @name ChatMessageListEmpty
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {Typography, useCPK} from 'cpk-ui';
import {Platform} from 'react-native';
import {t} from '../STRINGS';

export default function ChatMessageListEmpty(): JSX.Element {
  const {theme} = useCPK();

  return (
    <Container>
      <Content>
        <MessageContainer>
          <Typography.Body2
            accessibilityLabel={t('chat.martieThinkingAccessibility')}
            accessibilityRole="progressbar"
            accessibilityState={{busy: true}}
            style={css`
              margin-bottom: 8px;
              border-radius: 12px;
              text-align: left;
              background-color: ${theme.bg.paper};
              color: ${theme.text.disabled};
              font-size: 14px;
              line-height: 22px;
              padding: ${Platform.select({
                native: '6px 12px;',
                web: '6px;',
              })};
              /* For web */
              text-indent: -4px;
            `}
          >
            {t('common.thinking')}
          </Typography.Body2>
        </MessageContainer>
      </Content>
    </Container>
  );
}
const Container = styled.View`
  padding: 8px 16px;

  flex-direction: row;
  gap: 16px;
`;

const Content = styled.View`
  flex: 1;
  align-self: stretch;
  gap: 6px;
`;

const MessageContainer = styled.View`
  align-items: flex-start;
  gap: 8px;
`;
