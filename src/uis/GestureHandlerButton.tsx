/**
 * @name GestureHandlerButton
 *
 * @description
 * A custom button component built with RectButton from react-native-gesture-handler.
 * This component replaces the original Button from cpk-ui to address touch event issues
 * in modals when used with react-native-reanimated animations. It provides a stable
 * alternative with consistent styling and behavior matching the original Button,
 * ensuring reliable press interactions in complex UI scenarios.
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */

import React, {useCallback, useRef, useState} from 'react';
import type {Insets, StyleProp, TextStyle, ViewStyle} from 'react-native';
import {Platform, View} from 'react-native';
import {RectButton, RectButtonProps} from 'react-native-gesture-handler';
import {useHover} from 'react-native-web-hooks';
import {styled, css} from 'kstyled';
import * as Haptics from 'expo-haptics';
import {CpkTheme, LoadingIndicator, Typography, useCPK} from 'cpk-ui';
import {cloneElemWithDefaultColors} from 'cpk-ui/utils/guards';

// Button 타입 정의
export type ButtonType = 'text' | 'solid' | 'outlined';
export type ButtonColorType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light';
export type ButtonSizeType = 'small' | 'medium' | 'large';

// Props 타입 정의 (RectButtonProps 기반)
export type Props = Omit<RectButtonProps, 'onPress'> & {
  testID?: string;
  type?: ButtonType;
  color?: ButtonColorType;
  size?: ButtonSizeType;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  loadingElement?: JSX.Element;
  text?: string | JSX.Element;
  borderRadius?: number;
  startElement?: JSX.Element;
  endElement?: JSX.Element;
  style?: StyleProp<Omit<ViewStyle, 'borderRadius' | 'padding'>>;
  styles?: Styles;
  onPress?: (pointerInside: boolean) => void; // RectButtonProps에 맞춘 타입
  hitSlop?: null | Insets | number | undefined;
  hapticFeedback?: Haptics.ImpactFeedbackStyle;
  children?: React.ReactNode; // 자식 요소 추가
};

// 세부 스타일 타입 정의
type Styles = {
  container?: StyleProp<ViewStyle>;
  content?: StyleProp<ViewStyle>;
  loading?: StyleProp<ViewStyle>;
  text?: StyleProp<TextStyle>;
  disabled?: StyleProp<ViewStyle>;
  disabledText?: StyleProp<TextStyle>;
  hovered?: StyleProp<ViewStyle>;
};

// 버튼 컨테이너 스타일 props 타입
type ButtonContainerStyleProps = {
  type: ButtonType;
  size?: ButtonSizeType;
  disabled?: boolean;
  loading?: boolean;
};

// 버튼 컨테이너 스타일 컴포넌트
const ButtonContainer = styled.View<ButtonContainerStyleProps>`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

/**
 * 버튼 스타일을 계산하는 함수
 * @param theme - 테마 객체
 * @param type - 버튼 타입 (text, solid, outlined)
 * @param color - 버튼 색상
 * @param size - 버튼 크기
 * @param loading - 로딩 상태
 * @param disabled - 비활성화 상태
 * @param borderRadius - 테두리 반경
 * @param hovered - 호버 상태
 * @param styles - 커스텀 스타일
 * @param pressed - 눌림 상태
 * @returns 계산된 스타일 객체
 */
const calculateStyles = ({
  type,
  color,
  size,
  loading,
  disabled,
  borderRadius,
  hovered,
  styles,
  theme,
  pressed,
}: {
  type: ButtonType;
  color: ButtonColorType;
  size: ButtonSizeType;
  loading: boolean;
  disabled: boolean;
  borderRadius: number;
  hovered: boolean;
  styles?: Styles;
  theme: CpkTheme;
  pressed: boolean;
}): Styles => {
  const isDisabled = disabled || loading;
  const padding =
    type === 'text'
      ? '8px'
      : size === 'large'
        ? '16px 32px'
        : size === 'small'
          ? '8px 16px'
          : '12px 24px';

  return {
    container: [
      css`
        border-radius: ${borderRadius + 'px'};
        padding: ${padding};
        background-color: ${isDisabled
          ? theme.button.disabled.bg
          : ['text', 'outlined'].includes(type)
            ? theme.bg.basic
            : theme.button[color].bg};
        border-color: ${isDisabled
          ? theme.bg.disabled
          : type === 'text'
            ? 'transparent'
            : theme.button[color].bg};
        border-width: ${type !== 'text' ? '1px' : 0};
        opacity: ${pressed && !isDisabled
          ? '0.8'
          : '1'}; // 눌림 상태에서 opacity 적용
      `,
      styles?.container,
    ],
    text: [
      css`
        color: ${isDisabled
          ? theme.button.disabled.text
          : type === 'solid' || color === 'light'
            ? theme.button[color].text
            : theme.button[color].bg};
      `,
      styles?.text,
    ],
    content: [
      css`
        flex-direction: row;
        align-items: center;
        opacity: ${loading ? '0' : '1'};
        gap: 8px;
      `,
      styles?.content,
    ],
    loading: [
      css`
        position: absolute;
        opacity: ${loading ? '1' : '0'};
      `,
      styles?.loading,
    ],
    hovered: hovered
      ? [
          {
            shadowColor: 'black',
            shadowOpacity: 0.24,
            shadowRadius: 16,
            elevation: 10,
          },
          css`
            border-radius: ${borderRadius + 'px'};
          `,
          styles?.hovered,
        ]
      : undefined,
    disabled: isDisabled
      ? [
          css`
            background-color: ${theme.button.disabled.bg};
            border-color: ${theme.bg.disabled};
          `,
          styles?.disabled,
        ]
      : undefined,
  };
};

/**
 * 버튼 상태를 관리하는 훅
 * @param disabled - 비활성화 여부
 * @param onPress - 클릭 핸들러
 * @param loading - 로딩 상태
 * @returns 버튼의 내부 상태
 */
const useButtonState = ({
  disabled,
  onPress,
  loading,
}: {
  disabled?: boolean;
  onPress?: (pointerInside: boolean) => void;
  loading: boolean;
}): {
  innerDisabled: boolean;
  isLoading: boolean;
} => {
  return {
    innerDisabled: disabled || !onPress,
    isLoading: loading,
  };
};

/**
 * GestureHandlerButton 컴포넌트
 * @param props - 버튼 속성
 * @returns 버튼 JSX 요소
 */
export function GestureHandlerButton({
  testID,
  type = 'solid',
  color = 'primary',
  size = 'medium',
  disabled,
  loading = false,
  loadingElement,
  text,
  startElement,
  endElement,
  style,
  styles,
  onPress,
  borderRadius = 4,
  loadingColor,
  hitSlop = {top: 8, bottom: 8, left: 8, right: 8},
  hapticFeedback,
  ...rectButtonProps
}: Props): JSX.Element {
  const ref = useRef<View | null>(null);
  const hovered = useHover(ref); // 웹에서 호버 상태 감지
  const {theme} = useCPK(); // CPK 테마 사용
  const [pressed, setPressed] = useState(false); // 눌림 상태 관리

  const {innerDisabled} = useButtonState({disabled, onPress, loading});
  const compositeStyles: Styles = calculateStyles({
    type,
    color,
    size,
    loading,
    disabled: innerDisabled,
    borderRadius,
    hovered,
    styles,
    theme,
    pressed,
  });

  // 로딩 인디케이터 설정
  const LoadingView = loadingElement ?? (
    <LoadingIndicator
      color={
        loadingColor
          ? loadingColor
          : type === 'solid'
            ? theme.text.contrast
            : theme.text.basic
      }
      size="small"
    />
  );

  // 버튼 내부 콘텐츠 렌더링 함수
  const renderContainer = useCallback(
    ({
      children,
      loadingView,
    }: {
      children: JSX.Element;
      loadingView: JSX.Element;
    }): JSX.Element => (
      <ButtonContainer
        disabled={innerDisabled}
        size={size}
        style={[
          hovered && !innerDisabled && compositeStyles.hovered,
          compositeStyles.container,
          type === 'text' &&
            css`
              background-color: transparent;
            `,
          innerDisabled && compositeStyles.disabled,
        ]}
        testID={loading ? 'loading-view' : 'button-container'}
        type={type}
      >
        <View style={compositeStyles.content}>{children}</View>
        <View style={compositeStyles.loading}>{loadingView}</View>
      </ButtonContainer>
    ),
    [
      innerDisabled,
      size,
      compositeStyles.container,
      compositeStyles.hovered,
      compositeStyles.disabled,
      compositeStyles.content,
      compositeStyles.loading,
      hovered,
      type,
      loading,
    ],
  );

  // 스타일 해석 유틸리티 함수
  function resolveStyle<T>(style: StyleProp<T>): T | undefined {
    if (Array.isArray(style)) {
      return style.find((s): s is T => !!s);
    }
    return (style as T) || undefined;
  }

  const viewStyle = resolveStyle<ViewStyle>(compositeStyles.container);
  const textStyle = resolveStyle<TextStyle>(compositeStyles.text);

  // 버튼 내부 콘텐츠
  const ChildView = (
    <>
      {cloneElemWithDefaultColors({
        element: startElement,
        backgroundColor: viewStyle?.backgroundColor,
        color: textStyle?.color,
      })}
      {!text || typeof text === 'string' ? (
        <Typography.Body2 style={compositeStyles.text}>{text}</Typography.Body2>
      ) : (
        text
      )}
      {cloneElemWithDefaultColors({
        element: endElement,
        backgroundColor: viewStyle?.backgroundColor,
        color: textStyle?.color,
      })}
    </>
  );

  return (
    <RectButton
      {...rectButtonProps}
      enabled={!innerDisabled && !loading} // 비활성화 또는 로딩 시 터치 비활성화
      onPress={onPress} // RectButtonProps에 맞춘 타입
      onActiveStateChange={(active) => {
        setPressed(active); // 눌림 상태 업데이트
        rectButtonProps.onActiveStateChange?.(active);
      }}
      style={[
        style,
        css`
          border-radius: ${borderRadius + 'px'};
        `,
      ]}
      hitSlop={hitSlop}
      testID={testID}
      ref={Platform.select({
        web: ref as unknown as React.Ref<typeof RectButton>,
        default: undefined,
      })}
    >
      {renderContainer({
        children: ChildView,
        loadingView: LoadingView,
      })}
    </RectButton>
  );
}
