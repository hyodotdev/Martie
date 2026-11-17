import type {StyleProp, ViewStyle} from 'react-native';
import {Platform, Text, View} from 'react-native';
import ParsedText from 'react-native-parsed-text';
import {styled, css} from 'kstyled';
import {useCPK} from 'cpk-ui';
import {IC_MARTIE} from '../icons';
import {openURL} from 'expo-linking';
import {ChatMessage} from '../types';
import {t} from '../STRINGS';

const URL_PATTERN = /https?:\/\/|www\./i;

function AIChatMessageListItem({reply}: {reply: string}): JSX.Element {
  const {theme} = useCPK();
  const isThinking = reply === t('common.thinking');
  const hasUrl = URL_PATTERN.test(reply);
  const accessibilityLabel = isThinking
    ? t('chat.martieThinkingAccessibility')
    : t('chat.martieMessageAccessibility', {message: reply});
  const speakerPrefixLabel = t('chat.martieMessageAccessibility', {
    message: '',
  });

  return (
    <View
      style={css`
        padding: 8px 16px;

        gap: 8px;
      `}
    >
      <MartieImage
        accessible={false}
        aria-hidden={true}
        importantForAccessibility="no"
        source={IC_MARTIE}
      />
      <Content>
        <MessageContainer>
          {hasUrl && !isThinking ? (
            <Text
              accessibilityLabel={speakerPrefixLabel}
              accessibilityRole="text"
              style={css`
                position: absolute;
                width: 1px;
                height: 1px;
                opacity: 0;
              `}
            >
              {speakerPrefixLabel}
            </Text>
          ) : null}
          <ParsedText
            accessibilityLabel={hasUrl ? undefined : accessibilityLabel}
            accessibilityRole={isThinking ? 'progressbar' : 'text'}
            accessibilityState={isThinking ? {busy: true} : undefined}
            parse={[
              {
                type: 'url',
                onPress: (url) => openURL(url),
                style: css`
                  color: ${theme.role.primary};
                  text-decoration: underline;
                  text-decoration-color: ${theme.role.primary};
                `,
              },
            ]}
            selectable
            style={css`
              margin-bottom: 8px;
              text-align: left;
              background-color: ${theme.bg.paper};
              color: ${reply !== t('common.thinking')
                ? theme.text.basic
                : theme.text.placeholder};
              font-size: 14px;
              line-height: 22px;
              border-radius: 16px;
              padding: ${Platform.select({
                native: '6px 12px;',
                web: '6px;',
              })};
              /* For web */
              text-indent: -4px;
            `}
          >
            {reply}
          </ParsedText>
        </MessageContainer>
      </Content>
    </View>
  );
}

function HumanChatMessageListItem({message}: {message: string}): JSX.Element {
  const {theme} = useCPK();
  const hasUrl = URL_PATTERN.test(message);
  const accessibilityLabel = t('chat.userMessageAccessibility', {message});
  const speakerPrefixLabel = t('chat.userMessageAccessibility', {
    message: '',
  });

  return (
    <View
      style={css`
        padding: 8px 16px;
        align-self: stretch;
        align-items: flex-end;
      `}
    >
      <MessageContainer
        style={css`
          background-color: ${theme.text.contrast};
          border-radius: 16px;

          flex-direction: row;
        `}
      >
        {hasUrl ? (
          <Text
            accessibilityLabel={speakerPrefixLabel}
            accessibilityRole="text"
            style={css`
              position: absolute;
              width: 1px;
              height: 1px;
              opacity: 0;
            `}
          >
            {speakerPrefixLabel}
          </Text>
        ) : null}
        <ParsedText
          accessibilityLabel={hasUrl ? undefined : accessibilityLabel}
          accessibilityRole="text"
          parse={[
            {
              type: 'url',
              onPress: (url) => openURL(url),
              style: css`
                color: ${theme.role.primary};
                text-decoration: underline;
                text-decoration-color: ${theme.role.primary};
              `,
            },
          ]}
          selectable
          style={css`
            color: ${theme.text.basic};
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
          {message}
        </ParsedText>
      </MessageContainer>
    </View>
  );
}

type Props = {style?: StyleProp<ViewStyle>; item: ChatMessage};

export default function ChatMessageListItem({style, item}: Props): JSX.Element {
  const {message, reply} = item;

  return (
    <View
      style={[
        css`
          align-self: stretch;
        `,
        style,
      ]}
    >
      {message ? <HumanChatMessageListItem message={message} /> : null}
      <AIChatMessageListItem reply={reply || ''} />
    </View>
  );
}

const Content = styled.View`
  flex: 1;
  align-self: stretch;
  gap: 6px;
`;

const MessageContainer = styled.View`
  align-items: flex-start;
  gap: 8px;
`;

const MartieImage = styled.Image`
  width: 48px;
  height: 48px;
  padding: 2px;
  border-radius: 24px;
  border-width: 2px;
  border-color: ${({theme}) => theme.role.border};
  background-color: ${({theme}) => theme.bg.paper};
`;
