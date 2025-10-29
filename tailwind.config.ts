import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          green: 'hsl(var(--primary-green))',
          white: '#ffffff', // Restore for compatibility
          gradient: '#29cf9f', // Restore for compatibility
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          green: '#20d68e', // Caribbean Green - for compatibility
          teal: '#00fdc2', // Bright Teal - for compatibility
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.muted.foreground'),
            lineHeight: '1.7',
            a: {
              color: theme('colors.primary.green'),
              textDecoration: 'none',
              fontWeight: '600',
              '&:hover': {
                color: theme('colors.secondary.teal'),
                textDecoration: 'underline',
              },
            },
            strong: { color: theme('colors.foreground') },
            'h1, h2, h3, h4': {
              color: theme('colors.foreground'),
              fontWeight: '700',
            },
            blockquote: {
              color: theme('colors.foreground'),
              borderLeftColor: theme('colors.primary.green'),
            },
            'ul > li::marker': {
              color: theme('colors.primary.green'),
            },
            'ol > li::marker': {
              color: theme('colors.primary.green'),
            },
            code: {
              color: theme('colors.foreground'),
              backgroundColor: theme('colors.muted.DEFAULT'),
              padding: '0.125rem 0.375rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.muted.foreground'),
            a: {
              color: theme('colors.secondary.teal'),
              '&:hover': {
                color: theme('colors.primary.green'),
              },
            },
            strong: { color: theme('colors.foreground') },
            'h1, h2, h3, h4': {
              color: theme('colors.foreground'),
            },
            blockquote: {
              borderLeftColor: theme('colors.secondary.teal'),
            },
            'ul > li::marker': {
              color: theme('colors.secondary.teal'),
            },
            'ol > li::marker': {
              color: theme('colors.secondary.teal'),
            },
            code: {
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
          },
        },
      }),
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
