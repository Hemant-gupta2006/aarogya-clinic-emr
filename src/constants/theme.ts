export const theme = {
  colors: {
    // Primary Brand Palette (AarogyaEMR Emerald / Teal)
    primary: '#0D9488', // Primary Teal
    primaryTeal: '#0D9488',
    darkEmerald: '#064E3B', // Dark Emerald
    emerald: '#059669', // Emerald
    tealLight: '#14B8A6', // Teal Light
    mint: '#CCFBF1', // Mint
    lightGreen: '#F0FDF4', // Light Green
    primaryLight: '#14B8A6',
    primaryDark: '#064E3B',
    primaryBg: '#F0FDF4',
    primaryMuted: '#CCFBF1',
    heroGradientStart: '#064E3B',
    heroGradientEnd: '#065F46',

    // Background & Surfaces
    background: '#F8FAFC', // Crisp clinical slate background
    surface: '#FFFFFF', // Pure white card surface
    card: '#FFFFFF', // Pure white elevated card
    cardBorder: '#E2E8F0', // Border
    border: '#E2E8F0',
    borderStrong: '#CBD5E1', // Border Strong
    cardBorderHighlight: '#CCFBF1', // Soft mint border accent
    surfaceSubtle: '#F1F5F9', // Light slate for inputs / inactive buttons

    // Status Colors
    success: '#059669', // Vibrant Green
    successBg: '#ECFDF5',
    warning: '#D97706', // Warm Amber
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    danger: '#DC2626', // Clinical Crimson
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    info: '#2563EB', // Royal Blue
    infoBg: '#EFF6FF',

    // Typography
    textPrimary: '#0F172A', // Slate 900
    text: '#0F172A',
    textSecondary: '#334155', // Slate 700
    textMuted: '#64748B', // Slate 500
    textLight: '#94A3B8', // Slate 400
    textInverse: '#FFFFFF',

    // Inputs & Forms
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
    inputBorderFocus: '#0D9488',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 11,
      sm: 12,
      md: 14,
      base: 15,
      lg: 16,
      xl: 18,
      xxl: 22,
      xxxl: 28,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },
  buttonHeights: {
    sm: 36,
    md: 46,
    lg: 52,
  },
  inputHeights: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  cardPadding: {
    sm: 10,
    md: 16,
    lg: 20,
  },
  iconSizes: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};
