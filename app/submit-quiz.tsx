/**
 * @name SubmitQuiz
 *
 * 유저가 직접 퀴즈를 출제하는 화면
 */
import {styled, css} from 'kstyled';
import {Button, Typography, useCPK} from 'cpk-ui';
import {Stack, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getLocale, t} from '../src/STRINGS';
import {
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useState, useEffect} from 'react';
import {api} from '../convex/_generated/api';
import {useMutation, useQuery} from 'convex/react';
import {toast} from '@backpackapp-io/react-native-toast';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {logScreenView} from '../src/utils/analytics';
import {categoriesMap} from '../src/utils/categoriesMap';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';

const QUIZ_LANGUAGE_MAP: Record<string, 'en' | 'ko' | 'ja'> = {
  ko: 'ko',
  ja: 'ja',
  en: 'en',
};

const FOOTER_TOP_PADDING = 12;
const FOOTER_BOTTOM_PADDING = 12;
const FOOTER_HORIZONTAL_MARGIN = 28;
const FOOTER_BUTTON_HEIGHT = 56;
const EXTRA_SCROLL_BOTTOM_PADDING = 16;

function SubmitQuizPage(): JSX.Element {
  const {theme} = useCPK();
  const {back} = useRouter();
  const {bottom} = useSafeAreaInsets();
  const submitQuiz = useMutation(api.quizSubmission.mutations.submitQuiz);
  const footerBottomPadding = bottom + FOOTER_BOTTOM_PADDING;
  const footerHeight =
    FOOTER_TOP_PADDING + FOOTER_BUTTON_HEIGHT + footerBottomPadding;

  const locale = getLocale();
  const quizLanguage = QUIZ_LANGUAGE_MAP[locale] || 'en';

  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'submit_quiz',
        screen_class: 'SubmitQuiz',
      });
  }, []);

  const allCategories = useQuery(api.category.queries.list);
  const selectedCategory = categoriesMap.find(
    (cat) => cat.name === selectedCategoryName,
  );
  const canSubmit =
    !!selectedCategoryName &&
    !!question.trim() &&
    answerIndex !== null &&
    options.every((o) => !!o.trim());
  const isSubmitDisabled = !canSubmit || loading;

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCategoryName || !question.trim() || answerIndex === null) {
      toast.error(t('submitQuiz.validationError'));
      return;
    }

    const emptyOption = options.find((o) => o.trim().length === 0);
    if (emptyOption !== undefined) {
      toast.error(t('submitQuiz.validationError'));
      return;
    }

    if (!allCategories) {
      toast.error(t('error.message'));
      return;
    }

    const category = allCategories.find((c) => c.name === selectedCategoryName);
    if (!category) {
      toast.error(t('submitQuiz.validationError'));
      return;
    }

    setLoading(true);
    try {
      await submitQuiz({
        categoryId: category._id,
        language: quizLanguage,
        question: question.trim(),
        options: options.map((text, i) => ({
          text: text.trim(),
          isAnswer: i === answerIndex,
        })),
        answerExplanation: explanation.trim() || undefined,
      });

      toast.success(t('submitQuiz.success'));
      back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('error.message');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('submitQuiz.title'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoiding behavior="padding" automaticOffset>
          <Content
            alwaysBounceVertical
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollIndicatorInsets={{bottom: footerHeight}}
            contentContainerStyle={{
              flexGrow: 1,
              gap: 18,
              paddingBottom: EXTRA_SCROLL_BOTTOM_PADDING,
              paddingHorizontal: 20,
              paddingTop: 12,
            }}
          >
            <Section>
              <SectionHeader>
                <SectionTitle>{t('submitQuiz.category')}</SectionTitle>
                {selectedCategory ? (
                  <SelectedText>
                    {selectedCategory.localizedString}
                  </SelectedText>
                ) : null}
              </SectionHeader>
              <CategoryRail
                horizontal
                directionalLockEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={css`
                  padding: 0 20px;
                  gap: 8px;
                `}
              >
                {categoriesMap.map((cat) => (
                  <CategoryChip
                    key={cat.name}
                    onPress={() => setSelectedCategoryName(cat.name)}
                    $selected={selectedCategoryName === cat.name}
                  >
                    <CategoryChipText
                      $selected={selectedCategoryName === cat.name}
                    >
                      {cat.localizedString}
                    </CategoryChipText>
                  </CategoryChip>
                ))}
              </CategoryRail>
            </Section>

            <Section>
              <SectionHeader>
                <SectionTitle>{t('submitQuiz.question')}</SectionTitle>
                <Counter>{question.length}/200</Counter>
              </SectionHeader>
              <FieldInput
                placeholder={t('submitQuiz.questionPlaceholder')}
                placeholderTextColor={theme.text.placeholder}
                value={question}
                onChangeText={setQuestion}
                maxLength={200}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                $focused={focusedField === 'question'}
                $tall
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField('question')}
              />
            </Section>

            <Section>
              <SectionHeader>
                <SectionTitle>{t('submitQuiz.options')}</SectionTitle>
                <Counter>{t('submitQuiz.selectCorrectAnswer')}</Counter>
              </SectionHeader>
              <OptionsList>
                {options.map((opt, index) => (
                  <OptionItem
                    key={index}
                    $selected={answerIndex === index}
                    $focused={focusedField === `option-${index}`}
                  >
                    <AnswerButton
                      onPress={() => setAnswerIndex(index)}
                      $selected={answerIndex === index}
                    >
                      <AnswerButtonText $selected={answerIndex === index}>
                        {String.fromCharCode(65 + index)}
                      </AnswerButtonText>
                    </AnswerButton>
                    <OptionInput
                      placeholder={`${t('submitQuiz.option')} ${index + 1}`}
                      placeholderTextColor={theme.text.placeholder}
                      value={opt}
                      onChangeText={(text) => handleOptionChange(index, text)}
                      maxLength={100}
                      $focused={focusedField === `option-${index}`}
                      onBlur={() => setFocusedField(null)}
                      onFocus={() => setFocusedField(`option-${index}`)}
                    />
                    <OptionCounter>{opt.length}/100</OptionCounter>
                  </OptionItem>
                ))}
              </OptionsList>
            </Section>

            <Section>
              <SectionHeader>
                <SectionTitle>{t('submitQuiz.explanation')}</SectionTitle>
                <Counter>{explanation.length}/300</Counter>
              </SectionHeader>
              <FieldInput
                placeholder={t('submitQuiz.explanationPlaceholder')}
                placeholderTextColor={theme.text.placeholder}
                value={explanation}
                onChangeText={setExplanation}
                maxLength={300}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                $focused={focusedField === 'explanation'}
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField('explanation')}
              />
            </Section>
          </Content>
          <Footer
            pointerEvents="box-none"
            $bottomPadding={footerBottomPadding}
            style={{
              paddingLeft: FOOTER_HORIZONTAL_MARGIN,
              paddingRight: FOOTER_HORIZONTAL_MARGIN,
            }}
          >
            <Button
              hapticFeedback={ImpactFeedbackStyle.Soft}
              disabled={isSubmitDisabled}
              text={t('submitQuiz.submit')}
              style={css`
                align-self: stretch;
                height: ${FOOTER_BUTTON_HEIGHT}px;
              `}
              styles={{
                container: css`
                  height: ${FOOTER_BUTTON_HEIGHT}px;
                  border-width: 0;
                `,
                text: css`
                  font-size: 17px;
                  font-weight: 700;
                `,
              }}
              onPress={handleSubmit}
              loading={loading}
              borderRadius={12}
            />
          </Footer>
        </KeyboardAvoiding>
      </TouchableWithoutFeedback>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const KeyboardAvoiding = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const Content = styled(ScrollView)`
  flex: 1;
`;

const Section = styled.View`
  gap: 10px;
`;

const SectionHeader = styled.View`
  min-height: 24px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SectionTitle = styled(Typography.Body2)`
  color: ${({theme}) => theme.text.basic};
  font-weight: 700;
`;

const SelectedText = styled(Typography.Body4)`
  color: ${({theme}) => theme.role.primary};
  font-weight: 700;
`;

const Counter = styled(Typography.Body4)`
  flex-shrink: 1;
  color: ${({theme}) => theme.text.placeholder};
  text-align: right;
`;

const CategoryRail = styled(ScrollView)`
  margin: 0 -20px;
`;

const CategoryChip = styled(Pressable)<{$selected: boolean}>`
  min-height: 42px;
  justify-content: center;
  border-radius: 21px;
  border-width: 1px;
  padding: 0 16px;
  border-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : theme.role.border};
  background-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : theme.bg.paper};
`;

const CategoryChipText = styled(Typography.Body3)<{$selected: boolean}>`
  color: ${({$selected, theme}) =>
    $selected ? theme.text.contrast : theme.text.basic};
  font-weight: 600;
`;

const FieldInput = styled(TextInput)<{$focused?: boolean; $tall?: boolean}>`
  min-height: ${({$tall}) => ($tall ? '112px' : '86px')};
  border-radius: 18px;
  border-width: 1.5px;
  border-color: ${({$focused, theme}) =>
    $focused ? theme.role.primary : theme.role.border};
  background-color: ${({theme}) => theme.bg.paper};
  color: ${({theme}) => theme.text.basic};
  font-size: 17px;
  line-height: 24px;
  padding: 15px 16px;
`;

const OptionsList = styled.View`
  gap: 10px;
`;

const OptionItem = styled.View<{$selected: boolean; $focused: boolean}>`
  position: relative;
  min-height: 64px;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  border-radius: 18px;
  border-width: 1.5px;
  border-color: ${({$focused, $selected, theme}) =>
    $selected
      ? theme.role.primary
      : $focused
        ? theme.text.placeholder
        : theme.role.border};
  background-color: ${({theme}) => theme.bg.paper};
  padding: 8px 12px;
`;

const AnswerButton = styled(Pressable)<{$selected: boolean}>`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : theme.role.border};
  background-color: ${({$selected, theme}) =>
    $selected ? theme.role.primary : 'transparent'};
`;

const AnswerButtonText = styled(Typography.Body3)<{$selected: boolean}>`
  color: ${({$selected, theme}) =>
    $selected ? theme.text.contrast : theme.text.label};
  font-weight: 800;
`;

const OptionInput = styled(TextInput)<{$focused?: boolean}>`
  flex: 1;
  min-height: 44px;
  color: ${({theme}) => theme.text.basic};
  font-size: 16px;
  padding: 0 42px 0 0;
`;

const OptionCounter = styled(Typography.Body4)`
  position: absolute;
  right: 14px;
  bottom: 8px;
  color: ${({theme}) => theme.text.placeholder};
`;

const Footer = styled.View<{$bottomPadding: number}>`
  padding-top: ${FOOTER_TOP_PADDING}px;
  padding-bottom: ${({$bottomPadding}) => $bottomPadding}px;
  background-color: ${({theme}) => theme.bg.basic};
`;

export default withErrorBoundary(SubmitQuizPage);
