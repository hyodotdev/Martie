import {CpkThemeParams} from 'cpk-ui/utils/theme';

export type CustomAppTheme = CpkThemeParams & {
  role: {
    icon: string;
    selectedBorder: string;
    unselectedBg: string;
    selectedBg: string;
    stripe: string;
  };
  bg: {
    bubble: string;
    progress: string;
    dialog: string;
  };
  text: {
    success: string;
    danger: string;
  };
};

export const light: CustomAppTheme = {
  role: {
    primary: '#FF5B50',
    icon: '#37140B',
    border: '#E8E8E8',
    selectedBorder: '#FFB1A3',
    selectedBg: '#F8F6E5',
    unselectedBg: '#F3F2E5',
    stripe: '#A3E635',
  },
  bg: {
    basic: '#FFFDF6',
    paper: '#F3F2E5',
    bubble: '#FFFFFF',
    progress: '#FF9F79',
    dialog: '#FFFFFF',
  },
  text: {
    basic: '#37140B',
    contrast: '#FFFFFF',
    disabled: '#8F8F8F',
    placeholder: '#BEBEBE',
    success: '#1FB763',
    danger: '#E53A3C',
  },
  button: {
    primary: {
      bg: '#FF5B50',
      text: '#FFFFFF',
    },
    secondary: {
      bg: '#F3F2E5',
      text: '#37140B',
    },
    disabled: {
      bg: '#E8E8E8',
      text: '#7C7C7C',
    },
    success: {
      bg: '#1FB763',
      text: '#FFFFFF',
    },
    danger: {
      bg: '#E53A3C',
      text: '#FFFFFF',
    },
    light: {
      bg: '#F3F2E5',
      text: '#37140B',
    },
  },
};

export const dark: CustomAppTheme = {
  role: {
    primary: '#FF5B50',
    icon: '#F4F1E8',
    border: '#45454A',
    selectedBorder: '#FFB1A3',
    selectedBg: '#333236',
    unselectedBg: '#3A3A3D',
    stripe: '#7FB127',
    success: '#35E879',
    danger: '#FF5252',
  },
  bg: {
    basic: '#1F2023',
    paper: '#303136',
    bubble: '#2B2C31',
    progress: '#FF9F79',
    dialog: '#25262A',
  },
  text: {
    basic: '#FFFDF6',
    contrast: '#2D2D2D',
    disabled: '#7F828C',
    placeholder: '#9A9CA6',
    success: '#35E879',
    danger: '#FF5252',
  },
  button: {
    primary: {
      bg: '#FF5B50',
      text: '#FFFFFF',
    },
    secondary: {
      bg: '#3A3A3D',
      text: '#FFFFFF',
    },
    disabled: {
      bg: '#37383D',
      text: '#8A8D96',
    },
    success: {
      bg: '#1FB763',
      text: '#FFFFFF',
    },
    danger: {
      bg: '#E53A3C',
      text: '#FFFFFF',
    },
    light: {
      bg: '#404040',
      text: '#FFFFFF',
    },
  },
};

export const theme = {
  light,
  dark,
};
