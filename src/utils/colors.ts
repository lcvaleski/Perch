// Color theme options
export const ColorThemes = {
  river: {
    name: 'River',
    primary: '#4682b4',
    primaryHover: 'rgb(90, 154, 214)',
    primaryLighter: 'rgb(120, 174, 224)',
  },
  forest: {
    name: 'Forest',
    primary: '#2d7a2d',
    primaryHover: 'rgb(72, 144, 72)',
    primaryLighter: 'rgb(102, 174, 102)',
  },
  sunset: {
    name: 'Sunset',
    primary: '#c25c3a',
    primaryHover: 'rgb(210, 120, 90)',
    primaryLighter: 'rgb(230, 150, 120)',
  },
  plum: {
    name: 'Plum',
    primary: '#8b5a8c',
    primaryHover: 'rgb(155, 110, 156)',
    primaryLighter: 'rgb(185, 140, 186)',
  },
};

// Track current theme
let currentTheme = ColorThemes.river;

export const setColorTheme = (theme: keyof typeof ColorThemes) => {
  currentTheme = ColorThemes[theme];
};

export const getCurrentTheme = () => currentTheme;
export const getCurrentThemeKey = () => {
  return Object.keys(ColorThemes).find(
    key => ColorThemes[key as keyof typeof ColorThemes] === currentTheme
  ) as keyof typeof ColorThemes;
};

// River's signature colors with theme support
export const Colors = {
  get riverBlue() { return currentTheme.primary; },
  get riverBlueHover() { return currentTheme.primaryHover; },
  get riverBlueLighter() { return currentTheme.primaryLighter; },
  riverBackground: 'rgb(243, 243, 243)',
  riverBlueLight: 'rgba(221, 238, 255, 1)',
  riverText: 'rgb(51, 51, 51)',
  riverTextSecondary: 'rgb(102, 102, 102)',
  riverBorder: 'rgb(221, 221, 221)',

  // Opacity variations
  riverTextOpacity07: 'rgba(51, 51, 51, 0.7)',
  riverTextSecondaryOpacity06: 'rgba(102, 102, 102, 0.6)',
  riverTextSecondaryOpacity07: 'rgba(102, 102, 102, 0.7)',
  riverTextSecondaryOpacity02: 'rgba(102, 102, 102, 0.2)',
  riverBorderOpacity05: 'rgba(221, 221, 221, 0.5)',
  riverBlueOpacity06: 'rgba(70, 130, 180, 0.6)',
};