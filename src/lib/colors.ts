// Brand colors from your logo
export const brandColors = {
  // Primary brand colors
  darkNavy: '#1C2E3A',     // Dark Navy Blue - main text
  tealBlue: '#2E6B83',     // Teal Blue - primary actions
  lightCream: '#F5F3EE',   // Light Cream/Beige - background
  brightYellow: '#E9A928',  // Bright Yellow/Gold - accents
  charcoalGrey: '#2B3A42', // Charcoal Grey - secondary text
  white: '#FFFFFF',        // White - cards and highlights
} as const;

// CSS classes using your brand colors (for use in components)
export const brandClasses = {
  // Backgrounds
  bgDarkNavy: 'bg-[#1C2E3A]',
  bgTealBlue: 'bg-[#2E6B83]', 
  bgLightCream: 'bg-[#F5F3EE]',
  bgBrightYellow: 'bg-[#E9A928]',
  bgCharcoalGrey: 'bg-[#2B3A42]',
  bgWhite: 'bg-white',
  
  // Text colors
  textDarkNavy: 'text-[#1C2E3A]',
  textTealBlue: 'text-[#2E6B83]',
  textLightCream: 'text-[#F5F3EE]', 
  textBrightYellow: 'text-[#E9A928]',
  textCharcoalGrey: 'text-[#2B3A42]',
  textWhite: 'text-white',
  
  // Border colors
  borderDarkNavy: 'border-[#1C2E3A]',
  borderTealBlue: 'border-[#2E6B83]',
  borderLightCream: 'border-[#F5F3EE]',
  borderBrightYellow: 'border-[#E9A928]',
  borderCharcoalGrey: 'border-[#2B3A42]',
  borderWhite: 'border-white',
} as const;

// Utility function to get brand color by name
export const getBrandColor = (colorName: keyof typeof brandColors): string => {
  return brandColors[colorName];
};
