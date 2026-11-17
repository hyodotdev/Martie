import {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Linking} from 'react-native';
import {styled, css} from 'kstyled';
import {Stack, useLocalSearchParams} from 'expo-router';
import {ChatMessage} from '../src/types';
import {Id} from '../convex/_generated/dataModel';
import ChatMessageListItem from '../src/uis/ChatMessageListItem';
import ChatInput from '../src/uis/ChatInput';
import ChatMessageListEmpty from '../src/uis/ChatMessageListEmpty';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {t} from '../src/STRINGS';
import {logError} from '../src/utils/error';
import {logEvent, LOG_EVENTS} from '../src/utils/analytics';
import {FlashList, FlashListRef} from '@shopify/flash-list';
import {Button, Typography, useCPK} from 'cpk-ui';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useModelStatus} from '../src/hooks/useModelStatus';

let ondeviceAi: typeof import('expo-ondevice-ai') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ondeviceAi = require('expo-ondevice-ai');
} catch {
  // expo-ondevice-ai not available (e.g. web)
}

const SYSTEM_PROMPT =
  "You are 'Martie', a cute crow character—'마티' in Korean, 'マティ' in Japanese! Answer users' quiz questions briefly and charmingly in a bright, warm tone, full of Martie's unique charm—no greetings, just the answers! Keep responses under 3 sentences. Respond in the user's language.";

type SearchParams = {
  question: string;
};

export default function Chat(): JSX.Element {
  const {question} = useLocalSearchParams<SearchParams>();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const [initialQuestionAsked, setInitialQuestionAsked] = useState(false);
  const {theme} = useCPK();

  const {
    isReady,
    isChecking,
    needsSetup,
    isDownloading,
    isNotSupported,
    isError,
    downloadProgress,
    downloadModel,
  } = useModelStatus();

  const askOnDeviceAi = useCallback(
    async (
      userMessage: string,
      history: {role: 'user' | 'assistant'; content: string}[],
    ): Promise<string> => {
      if (!ondeviceAi) throw new Error('On-device AI not available');
      const result = await ondeviceAi.chat(userMessage, {
        systemPrompt: SYSTEM_PROMPT,
        history,
      });

      const res = result as unknown as {
        result?: {message?: string};
        message?: string;
      };

      return (
        res?.result?.message ??
        res?.message ??
        t('chat.processingError')
      );
    },
    [],
  );

  // Ask the initial question once AI is ready
  useEffect(() => {
    if (!question || initialQuestionAsked || !isReady) return;

    const askAboutTheQuestion = async () => {
      try {
        setLoading(true);
        const decodedQuestion = decodeURIComponent(question);

        const reply = await askOnDeviceAi(decodedQuestion, []);

        const initialMessage: ChatMessage = {
          _id: `initial-${Date.now()}` as unknown as Id<'chats'>,
          _creationTime: Date.now(),
          message: '',
          reply,
        };

        setChatMessages((prev) => [...prev, initialMessage]);
        setInitialQuestionAsked(true);
      } catch (error) {
        logError(error, 'FAILED_INITIAL_QUESTION');

        const errorMessage: ChatMessage = {
          _id: `error-${Date.now()}` as unknown as Id<'chats'>,
          _creationTime: Date.now(),
          message: '',
          reply: t('chat.processingError'),
        };

        setChatMessages((prev) => [...prev, errorMessage]);
        setInitialQuestionAsked(true);
      } finally {
        setLoading(false);
      }
    };

    askAboutTheQuestion();
  }, [question, initialQuestionAsked, isReady, askOnDeviceAi]);

  const scrollToBottom = useCallback(() => {
    if (chatMessages.length > 0 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [chatMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  const sendChatMessage = useCallback(async (): Promise<void> => {
    if (!message.trimStart() || !isReady) return;

    const currentMessage = message;
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logEvent(LOG_EVENTS.AI_CHAT_MESSAGE_SENT, {
      messageLength: currentMessage.length,
      historyLength: chatMessages.length,
      hadInitialQuestion: !!question,
    });

    try {

      const tempMessage: ChatMessage = {
        _id: tempId as unknown as Id<'chats'>,
        _creationTime: Date.now(),
        message: currentMessage,
        reply: t('common.thinking'),
      };

      setChatMessages((prev) => [...prev, tempMessage]);
      setMessage('');
      setLoading(true);

      const conversationHistory: {
        role: 'user' | 'assistant';
        content: string;
      }[] = chatMessages
        .slice(-10)
        .filter((msg) => msg.message || msg.reply)
        .flatMap((msg) => {
          const messages: {role: 'user' | 'assistant'; content: string}[] = [];
          if (msg.message) {
            messages.push({role: 'user', content: msg.message});
          }
          if (msg.reply && msg.reply !== t('common.thinking')) {
            messages.push({role: 'assistant', content: msg.reply});
          }
          return messages;
        });

      const reply = await askOnDeviceAi(currentMessage, conversationHistory);

      setChatMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id.toString() === tempId
            ? {...msg, message: currentMessage, reply}
            : msg,
        ),
      );
    } catch (e) {
      logError(e, 'FAILED_TO_SEND_MESSAGE');
      setChatMessages((prev) =>
        prev.filter((msg) => msg._id.toString() !== tempId),
      );
    } finally {
      setLoading(false);
    }
  }, [message, chatMessages, isReady, askOnDeviceAi, question]);

  const handleGoogleSearch = useCallback(() => {
    if (!question) return;
    const decoded = decodeURIComponent(question);
    const url = `https://www.google.com/search?q=${encodeURIComponent(decoded)}`;
    void Linking.openURL(url).catch((error) => {
      logError(error, 'FAILED_CHAT_GOOGLE_SEARCH');
    });
  }, [question]);

  const downloadPercent = Math.round(downloadProgress * 100);

  // --- Not supported: show Google search fallback ---
  if (isNotSupported || isError) {
    return (
      <Container>
        <Stack.Screen options={{title: ''}} />
        <CenterContent>
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no"
            source={require('../assets/icon.png')}
            style={css`
              width: 80px;
              height: 80px;
              border-radius: 40px;
              margin-bottom: 16px;
            `}
          />
          <Typography.Heading5
            accessibilityRole="header"
            style={css`
              text-align: center;
              margin-bottom: 8px;
            `}
          >
            {t('chat.aiNotSupported')}
          </Typography.Heading5>
          <Typography.Body2
            style={css`
              text-align: center;
              color: ${theme.text.label};
              margin-bottom: 24px;
              padding: 0 32px;
            `}
          >
            {t('chat.aiNotSupportedDesc')}
          </Typography.Body2>
          {question ? (
            <Button
              hapticFeedback={ImpactFeedbackStyle.Soft}
              onPress={handleGoogleSearch}
              accessibilityLabel={t('chat.searchOnGoogle')}
              text={t('chat.searchOnGoogle')}
              borderRadius={12}
              color="primary"
              style={css`
                width: 80%;
              `}
              styles={{
                container: css`
                  padding: 14px;
                  flex-direction: row;
                  gap: 8px;
                `,
                text: css`
                  font-size: 15px;
                  font-weight: bold;
                `,
              }}
              touchableHighlightProps={{
                accessibilityRole: 'link',
              }}
            />
          ) : null}
        </CenterContent>
      </Container>
    );
  }

  // --- Checking / Needs setup / Downloading ---
  if (isChecking || needsSetup || isDownloading) {
    return (
      <Container>
        <Stack.Screen options={{title: ''}} />
        <CenterContent>
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no"
            source={require('../assets/icon.png')}
            style={css`
              width: 80px;
              height: 80px;
              border-radius: 40px;
              margin-bottom: 16px;
            `}
          />
          {isChecking ? (
            <>
              <ActivityIndicator
                accessibilityLabel={t('chat.checkingAi')}
                accessibilityRole="progressbar"
                accessibilityState={{busy: true}}
                size="large"
                color={theme.role.primary}
                style={css`
                  margin-bottom: 12px;
                `}
              />
              <Typography.Body2
                style={css`
                  color: ${theme.text.label};
                `}
              >
                {t('chat.checkingAi')}
              </Typography.Body2>
            </>
          ) : isDownloading ? (
            <>
              <Typography.Heading5
                accessibilityRole="header"
                style={css`
                  text-align: center;
                  margin-bottom: 8px;
                `}
              >
                {t('chat.downloadingModel')}
              </Typography.Heading5>
              <ProgressBarContainer
                accessibilityLabel={t('chat.downloadingModel')}
                accessibilityRole="progressbar"
                accessibilityState={{busy: true}}
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: downloadPercent,
                }}
              >
                <ProgressBarFill
                  style={{width: `${downloadPercent}%`}}
                />
              </ProgressBarContainer>
              <Typography.Body3
                style={css`
                  color: ${theme.text.label};
                  margin-top: 8px;
                `}
              >
                {downloadPercent}%
              </Typography.Body3>
            </>
          ) : (
            <>
              <Typography.Heading5
                accessibilityRole="header"
                style={css`
                  text-align: center;
                  margin-bottom: 8px;
                `}
              >
                {t('chat.needsSetup')}
              </Typography.Heading5>
              <Typography.Body2
                style={css`
                  text-align: center;
                  color: ${theme.text.label};
                  margin-bottom: 24px;
                  padding: 0 32px;
                `}
              >
                {t('chat.needsSetupDesc')}
              </Typography.Body2>
              <Button
                hapticFeedback={ImpactFeedbackStyle.Soft}
                onPress={downloadModel}
                accessibilityLabel={t('chat.downloadModel')}
                text={t('chat.downloadModel')}
                borderRadius={12}
                color="primary"
                style={css`
                  width: 80%;
                `}
                styles={{
                  container: css`
                    padding: 14px;
                  `,
                  text: css`
                    font-size: 15px;
                    font-weight: bold;
                  `,
                }}
              />
            </>
          )}
        </CenterContent>
      </Container>
    );
  }

  // --- AI Ready: show chat ---
  return (
    <Container>
      <Stack.Screen options={{title: ''}} />
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        onLayout={() => scrollToBottom()}
        style={css`
          flex: 1;
          align-self: stretch;
        `}
      >
        <FlashList
          keyExtractor={({_id}) => _id}
          ListEmptyComponent={<ChatMessageListEmpty />}
          data={chatMessages}
          ref={listRef}
          renderItem={({item}) => <ChatMessageListItem item={item} />}
        />

        <ChatInput
          createChatMessage={sendChatMessage}
          message={message}
          disabled={message.length === 0 || loading}
          loading={loading}
          setMessage={setMessage}
          placeholder={t('chat.placeholder')}
        />
      </KeyboardAvoidingView>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const CenterContent = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const Image = styled.Image``;

const ProgressBarContainer = styled.View`
  width: 70%;
  height: 8px;
  background-color: ${({theme}) => theme.bg.disabled};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.View`
  height: 100%;
  background-color: ${({theme}) => theme.role.primary};
  border-radius: 4px;
`;
