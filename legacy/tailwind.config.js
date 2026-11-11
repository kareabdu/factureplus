/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			heading: ['Inter', 'system-ui', 'sans-serif'],
  			body: ['Inter', 'system-ui', 'sans-serif'],
  			sans: ['Inter', 'system-ui', 'sans-serif']
  		},
  		screens: {
  			md: '1024px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			brandGreen: 'hsl(var(--brand-green))',
  			emerald: {
  				50: '#effaf1',
  				100: '#d8f3dd',
  				200: '#b3e6bd',
  				300: '#80d494',
  				400: '#47bf6c',
  				500: '#1ea94c',
  				600: '#07a43f',
  				700: '#068a35',
  				800: '#086d2c',
  				900: '#085827',
  				950: '#013211'
  			},
  			green: {
  				50: '#effaf1',
  				100: '#d8f3dd',
  				200: '#b3e6bd',
  				300: '#80d494',
  				400: '#47bf6c',
  				500: '#1ea94c',
  				600: '#07a43f',
  				700: '#068a35',
  				800: '#086d2c',
  				900: '#085827',
  				950: '#013211'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			brandBlue: 'hsl(var(--brand-blue))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			'soft': '0 2px 8px -2px rgba(0,0,0,0.08), 0 12px 32px -8px rgba(0,0,0,0.12)',
  			'float': '0 8px 24px -6px rgba(0,0,0,0.18), 0 24px 48px -12px rgba(0,0,0,0.14)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'float-up': {
  				from: { opacity: '0', transform: 'translateY(12px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float-up': 'float-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}