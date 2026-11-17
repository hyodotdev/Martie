/**
 * @name AlternativeBillingSheet
 *
 * Provider chooser shown after Google's native user-choice-billing flow
 * returns a matching product and external transaction token.
 */

import {useEffect} from 'react';
import {BackHandler, Platform, Pressable} from 'react-native';
import {css, styled} from 'kstyled';
import {Button, Typography, useCPK} from 'cpk-ui';
import {ImpactFeedbackStyle} from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import {t} from '../../STRINGS';
import {NaverBadgeMark, TossWordmark} from './PaymentBrandMark';
import {
  billingMethodCopy,
  isBillingMethodReady,
  type BillingMethod,
} from './billingMethods';

export type {BillingMethod};

type SheetProps = {
  visible: boolean;
  tossReady: boolean;
  naverReady: boolean;
  onSelect: (method: BillingMethod) => void;
  onClose: () => void;
};

const PG_METHODS: BillingMethod[] = ['toss', 'naver'];

function PgArt({method}: {method: BillingMethod}): JSX.Element {
  if (method === 'toss') {
    return <TossWordmark width={56} />;
  }

  return <NaverBadgeMark width={76} />;
}

export default function AlternativeBillingSheet({
  visible,
  tossReady,
  naverReady,
  onSelect,
  onClose,
}: SheetProps): JSX.Element | null {
  const {theme, themeType} = useCPK();

  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onClose();
          return true;
        },
      );
      return () => backHandler.remove();
    }

    return () => {};
  }, [onClose, visible]);

  if (!visible) {
    return null;
  }

  const handleClose = (): void => {
    onClose();
  };

  const handleSelect = (method: BillingMethod): void => {
    onSelect(method);
  };

  const readiness = {tossReady, naverReady};

  return (
    <SheetContainer entering={FadeIn} exiting={FadeOut}>
      <Backdrop
        onPress={handleClose}
        style={
          themeType === 'dark'
            ? css`
                background-color: rgba(0, 0, 0, 0.62);
              `
            : css`
                background-color: rgba(0, 0, 0, 0.48);
              `
        }
      />
      <Sheet entering={SlideInDown} exiting={SlideOutDown}>
        <Handle />
        <Typography.Heading4
          style={css`
            color: ${theme.text.basic};
          `}
        >
          {t('purchase.altBilling.chooseTitle')}
        </Typography.Heading4>
        <Options>
          <PgRows>
            {PG_METHODS.map((method) => {
              const ready = isBillingMethodReady(method, readiness);

              return (
                <PgRow
                  key={method}
                  disabled={!ready}
                  onPress={() => handleSelect(method)}
                  style={({pressed}) => [
                    css`
                      border-color: ${theme.role.border};
                      background-color: ${theme.bg.bubble};
                    `,
                    {opacity: !ready ? 0.45 : pressed ? 0.7 : 1},
                  ]}
                >
                  <ArtChip>
                    <PgArt method={method} />
                  </ArtChip>
                  <PgText>
                    <Typography.Body2
                      style={css`
                        font-weight: bold;
                        color: ${theme.text.basic};
                      `}
                    >
                      {t(billingMethodCopy[method].titleKey)}
                    </Typography.Body2>
                    <Typography.Body4
                      style={css`
                        margin-top: 2px;
                        color: ${theme.text.disabled};
                      `}
                    >
                      {ready
                        ? t(billingMethodCopy[method].descKey)
                        : t('purchase.altBilling.missingClientKey')}
                    </Typography.Body4>
                  </PgText>
                </PgRow>
              );
            })}
          </PgRows>
        </Options>

        <Button
          borderRadius={16}
          color="secondary"
          hapticFeedback={ImpactFeedbackStyle.Soft}
          onPress={handleClose}
          styles={{
            container: css`
              height: 52px;
              border-width: 0;
              margin-top: 4px;
              background-color: ${theme.bg.paper};
            `,
            text: css`
              color: ${theme.text.basic};
              font-size: 16px;
              font-weight: bold;
            `,
          }}
          text={t('common.cancel')}
          touchableHighlightProps={{
            underlayColor: theme.role.underlay,
          }}
        />
      </Sheet>
    </SheetContainer>
  );
}

const SheetContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  justify-content: flex-end;
`;

const Backdrop = styled(Pressable)`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const Sheet = styled(Animated.View)`
  width: 100%;
  max-width: 560px;
  align-self: center;
  background-color: ${({theme}) => theme.bg.dialog};
  border-top-left-radius: 28px;
  border-top-right-radius: 28px;
  padding: 12px 20px 28px 20px;
  shadow-color: #000;
  shadow-offset: 0px -8px;
  shadow-opacity: 0.14;
  shadow-radius: 24px;
  elevation: 12;
`;

const Handle = styled.View`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  align-self: center;
  margin-bottom: 14px;
  background-color: ${({theme}) => theme.role.border};
`;

const Options = styled.View`
  margin-top: 16px;
  margin-bottom: 12px;
  gap: 12px;
`;

const PgRows = styled.View`
  margin-top: 12px;
  gap: 10px;
`;

const PgRow = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  border-radius: 16px;
  border-width: 1px;
  padding: 10px;
  gap: 12px;
`;

const ArtChip = styled.View`
  width: 104px;
  height: 48px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
`;

const PgText = styled.View`
  flex: 1;
`;
