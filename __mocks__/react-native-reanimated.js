const {View, Text, Image, Animated} = require('react-native');

const useSharedValue = (init) => ({
  value: init,
  get() {
    return this.value;
  },
  set(next) {
    this.value = next;
  },
});
const useAnimatedStyle = (fn) => fn();
const useDerivedValue = (fn) => ({value: fn()});
const useAnimatedScrollHandler = () => ({});
const useAnimatedRef = () => ({current: null});

module.exports = {
  __esModule: true,
  default: {
    createAnimatedComponent: (component) => component,
    View,
    Text,
    Image,
    ScrollView: View,
    FlatList: View,
  },
  useSharedValue,
  // Gesture Handler 3 asks whether config values are shared values.
  isSharedValue: (value) =>
    typeof value === 'object' && value !== null && typeof value.get === 'function',
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedGestureHandler: jest.fn(),
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  withDecay: jest.fn(),
  withDelay: (_, animation) => animation,
  withSequence: (...args) => args[args.length - 1],
  withRepeat: (animation) => animation,
  cancelAnimation: jest.fn(),
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    poly: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    elastic: jest.fn(),
    back: jest.fn(),
    bounce: jest.fn(),
    bezier: jest.fn(() => jest.fn()),
    in: jest.fn(),
    out: jest.fn(),
    inOut: jest.fn(),
  },
  Extrapolation: {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
  },
  interpolate: jest.fn(),
  interpolateColor: jest.fn(),
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  makeMutable: (init) => ({value: init}),
  createAnimatedComponent: (component) => component,
  FadeIn: {duration: jest.fn(() => ({delay: jest.fn()}))},
  FadeOut: {duration: jest.fn(() => ({delay: jest.fn()}))},
  FadeInDown: {duration: jest.fn(() => ({delay: jest.fn()}))},
  FadeOutUp: {duration: jest.fn(() => ({delay: jest.fn()}))},
  SlideInDown: {duration: jest.fn()},
  SlideOutDown: {duration: jest.fn()},
  Layout: {duration: jest.fn()},
  ReduceMotion: {System: 0, Always: 1, Never: 2},
  ColorSpace: {RGB: 0, HSV: 1},
  KeyboardState: {UNKNOWN: 0, OPEN: 1, CLOSED: 2},
  InterfaceOrientation: {
    PORTRAIT: 0,
    LANDSCAPE_LEFT: 1,
    LANDSCAPE_RIGHT: 2,
    PORTRAIT_UPSIDE_DOWN: 3,
  },
  IOSReferenceFrame: {AUTO: 0, SCREEN: 1, WINDOW: 2},
  advanceAnimationByFrame: jest.fn(),
  advanceAnimationByTime: jest.fn(),
  getAnimatedStyle: jest.fn(),
  measure: jest.fn(),
  scrollTo: jest.fn(),
  setNativeProps: jest.fn(),
  useScrollViewOffset: jest.fn(() => ({value: 0})),
  useReducedMotion: jest.fn(() => false),
  useFrameCallback: jest.fn(),
  processColor: jest.fn(),
  reanimatedVersion: '4.2.1',
};
