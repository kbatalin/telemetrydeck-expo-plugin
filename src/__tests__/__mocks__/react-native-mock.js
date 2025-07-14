module.exports = {
  Appearance: { 
    getColorScheme: () => 'light' 
  },
  Dimensions: { 
    get: () => ({ width: 375, height: 812 }) 
  },
  I18nManager: { 
    isRTL: false 
  },
  PixelRatio: { 
    get: () => 2, 
    getFontScale: () => 1 
  },
  Platform: { 
    OS: 'ios' 
  },
  AccessibilityInfo: {
    isBoldTextEnabled: () => Promise.resolve(false),
    isInvertColorsEnabled: () => Promise.resolve(false),
    isReduceMotionEnabled: () => Promise.resolve(false),
    isReduceTransparencyEnabled: () => Promise.resolve(false),
  },
}; 