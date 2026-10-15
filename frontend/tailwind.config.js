/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Google-inspired color palette
        'google-bg': {
          DEFAULT: '#181818', // Google dark background - updated to #181818
          light: '#303134',   // Google dark surface
          lighter: '#3c4043', // Slightly lighter shade for hover states
        },
        'google-blue': {
          DEFAULT: '#8ab4f8', // Google's primary blue in dark mode
          light: '#aecbfa',   // Lighter blue for hover states
          dark: '#669df6',    // Darker blue for active states
        },
        'google-green': {
          DEFAULT: '#81c995', // Google's green accent
          light: '#a8dab5',   // Lighter green
          dark: '#5bb974',    // Darker green
        },
        'google-red': {
          DEFAULT: '#f28b82',  // Google's red
          light: '#f6aea9',    // Lighter red
          dark: '#ee675c',     // Darker red
        },
        'google-yellow': {
          DEFAULT: '#fdd663',  // Google's yellow
          light: '#fee599',    // Lighter yellow
          dark: '#fcc934',     // Darker yellow
        },
        'google-grey': {
          100: '#e8eaed',      // Primary text in dark mode
          200: '#bdc1c6',      // Mid-gray text
          300: '#9aa0a6',      // Secondary text
          400: '#5f6368',      // Subtle text
        },
        // Legacy theme colors (remapped to Google palette)
        primary: {
          DEFAULT: '#8ab4f8', // Google blue
          light: '#aecbfa',   // Light blue
          dark: '#669df6',    // Dark blue
        },
        secondary: {
          DEFAULT: '#81c995', // Google green
          light: '#a8dab5',   // Light green
          dark: '#5bb974',    // Dark green
        },
        background: {
          DEFAULT: '#181818', // Google dark background - updated to #181818
          dark: '#181818',    // Dark - updated to #181818
          light: '#303134',   // Lighter
        },
        surface: {
          DEFAULT: '#303134', // Google dark surface
          dark: '#3c4043',    // Darker surface
          light: '#3c4043',   // Lighter surface
        },
        accent: {
          DEFAULT: '#fdd663', // Google yellow
          light: '#fee599',   // Light accent
          dark: '#fcc934',    // Dark accent
        },
        error: {
          DEFAULT: '#f28b82', // Google red
          light: '#f6aea9',   // Light error
          dark: '#ee675c',    // Dark error
        },
        success: {
          DEFAULT: '#81c995', // Google green
          light: '#a8dab5',   // Light success
          dark: '#5bb974',    // Dark success
        },
        warning: {
          DEFAULT: '#fdd663', // Google yellow
          light: '#fee599',   // Light warning
          dark: '#fcc934',    // Dark warning
        },
        info: {
          DEFAULT: '#8ab4f8', // Google blue
          light: '#aecbfa',   // Light info
          dark: '#669df6',    // Dark info
        },
      },
      fontFamily: {
        sans: ['Roboto', 'Arial', 'system-ui', 'sans-serif'],
        display: ['Google Sans', 'Product Sans', 'Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'card': '0 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 4px 8px 3px rgba(0, 0, 0, 0.2)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}