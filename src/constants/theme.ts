/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const getThemeColors = (isDark: boolean) => {
  return {
    isDark,
    bg: isDark ? '#121212' : '#F8F7F3',
    cardBg: isDark ? '#1E1E1E' : '#FFFFFF',
    cardBgElevated: isDark ? '#262626' : '#F8F7F3',
    cardBgSecondary: isDark ? '#2D271E' : '#F5EEDC',
    textMain: isDark ? '#FFFFFF' : '#212121',
    textSub: isDark ? '#A0A0A0' : '#8A857A',
    textMuted: isDark ? '#757575' : '#B0ABA0',
    border: isDark ? '#333333' : '#EFEBE4',
    borderLight: isDark ? '#262626' : '#F5F5F5',
    borderStrong: isDark ? '#444444' : '#E0DDD5',
    accent: isDark ? '#D4AF37' : '#C88D2B',
    accentLight: isDark ? '#2D271E' : '#FFF9ED',
    accentBorder: isDark ? '#4D3B18' : '#F3E1BA',
    badgeBg: isDark ? '#2A2A2A' : 'rgba(255, 255, 255, 0.92)',
    inputBg: isDark ? '#262626' : '#FFFFFF',
    inputBorder: isDark ? '#3A3A3A' : '#E0DDD5',
    white: '#FFFFFF',
    darkText: '#121212',
    statusBarStyle: isDark ? ('light-content' as const) : ('dark-content' as const),
    statusBarBg: isDark ? '#121212' : '#F8F7F3',
  };
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
