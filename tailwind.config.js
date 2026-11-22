/** Token desain "Madrasah Administrative Modern" (DESIGN.md). Komponen memakai nama token, bukan HEX mentah. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#14532D', // Deep Madrasah Green
          600: '#166534',     // tombol utama
          700: '#14532D',     // hover
          800: '#0F3F22',     // ditekan
          900: '#0B3D2A',     // sidebar
          tint: '#E8F3EC',
        },
        gold: { DEFAULT: '#C9A227', 600: '#B08C1E', tint: '#FBF3D5', line: '#E9D48A' },
        canvas: '#F6F8F7',
        surface: { DEFAULT: '#FFFFFF', recessed: '#F1F5F4' },
        ink: { DEFAULT: '#0F172A', 2: '#475569', muted: '#94A3B8' },
        line: { DEFAULT: '#E2E8F0', input: '#CBD5E1' },
        ok: { DEFAULT: '#15803D', bg: '#DCFCE7', ink: '#166534' },
        warn: { DEFAULT: '#B45309', bg: '#FEF3C7', ink: '#92400E' },
        bad: { DEFAULT: '#B91C1C', bg: '#FEE2E2', ink: '#991B1B' },
        info: { DEFAULT: '#1D4ED8', bg: '#DBEAFE', ink: '#1D4ED8' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px', xl: '12px' },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15,23,42,.04), 0 1px 2px -1px rgba(15,23,42,.02)',
        pop: '0 4px 6px -1px rgba(15,23,42,.08), 0 2px 4px -2px rgba(15,23,42,.04)',
        modal: '0 20px 25px -5px rgba(15,23,42,.10), 0 8px 10px -6px rgba(15,23,42,.04)',
      },
      maxWidth: { content: '1600px' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 1.2s linear infinite',
        'slide-up': 'slide-up .22s ease-out',
        'fade-in': 'fade-in .15s ease-out',
      },
    },
  },
  plugins: [],
};
