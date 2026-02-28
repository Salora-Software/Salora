<script lang="ts">
	import { onMount } from 'svelte';

	let { colorTheme = $bindable('blue'), children } = $props();

	// Color theme definitions with sections for sidebar and content
	const colorThemes = {
		blue: {
			light: {
				// SIDEBAR VARIABLES
				'--widget-sidebar-bg': 'oklch(0.98 0.01 220)',
				'--widget-sidebar-text': 'oklch(0.35 0.03 220)',
				'--widget-sidebar-text-muted': 'oklch(0.55 0.02 220)',
				'--widget-sidebar-accent': 'oklch(0.67 0.08 220)',
				'--widget-sidebar-border': 'oklch(0.92 0.02 220)',
				
				// CONTENT VARIABLES
				'--widget-content-bg': 'oklch(0.995 0.005 220)',
				'--widget-content-text': 'oklch(0.1 0.02 220)',
				'--widget-content-text-muted': 'oklch(0.4 0.02 220)',
				
				// INPUT VARIABLES
				'--widget-input-bg': 'oklch(0.99 0.008 220)',
				'--widget-input-border': 'oklch(0.87 0.02 220)',
				
				// ACCENT VARIABLES
				'--widget-accent': 'oklch(0.67 0.08 220)',
				'--widget-accent-hover': 'oklch(0.62 0.1 220)',
				'--widget-accent-rgb': '102, 153, 204',
				
				// STATE VARIABLES
				'--widget-success': 'oklch(0.4 0.15 150)',
				'--widget-error': 'oklch(0.55 0.2 15)',
				
				// CALENDAR VARIABLES
				'--widget-calendar-bg': 'oklch(0.96 0.015 220)',
				'--widget-calendar-available': 'oklch(0.9 0.02 220)',
				'--widget-calendar-selected': 'oklch(0.67 0.08 220)',
				
				// TIME SLOT VARIABLES
				'--widget-time-slot-bg': 'oklch(0.94 0.015 220)',
				'--widget-time-slot-hover': 'oklch(0.88 0.025 220)',
				'--widget-time-slot-selected': 'oklch(0.67 0.08 220)',
				
				// DESIGN SYSTEM VARIABLES
				'--widget-font-family': 'Inter, system-ui, sans-serif',
				'--widget-border-radius': '8px',
				'--widget-border-radius-small': '6px',
				'--widget-border-radius-large': '12px',
				'--widget-spacing-xs': '4px',
				'--widget-spacing-sm': '8px',
				'--widget-spacing-md': '16px',
				'--widget-spacing-lg': '24px',
				'--widget-spacing-xl': '32px',
				'--widget-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)',
				'--widget-shadow-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
				'--widget-shadow-lg': '0 10px 25px rgba(0, 0, 0, 0.1)'
			},
			dark: {
				// SIDEBAR VARIABLES
				'--widget-sidebar-bg': 'oklch(0.12 0.003 240)',
				'--widget-sidebar-text': 'oklch(0.78 0.08 210)',
				'--widget-sidebar-text-muted': 'oklch(0.65 0.06 210)',
				'--widget-sidebar-accent': 'oklch(0.78 0.08 210)',
				'--widget-sidebar-border': 'oklch(0.2 0.01 240)',
				
				// CONTENT VARIABLES
				'--widget-content-bg': 'oklch(0.18 0.02 220)',
				'--widget-content-text': 'oklch(0.9 0.02 220)',
				'--widget-content-text-muted': 'oklch(0.7 0.02 220)',
				
				// INPUT VARIABLES
				'--widget-input-bg': 'oklch(0.45 0.04 210)',
				'--widget-input-border': 'oklch(0.55 0.05 210)',
				
				// ACCENT VARIABLES
				'--widget-accent': 'oklch(0.7 0.1 200)',
				'--widget-accent-hover': 'oklch(0.75 0.12 200)',
				'--widget-accent-rgb': '115, 173, 230',
				
				// STATE VARIABLES
				'--widget-success': 'oklch(0.5 0.15 150)',
				'--widget-error': 'oklch(0.6 0.2 15)',
				
				// CALENDAR VARIABLES
				'--widget-calendar-bg': 'oklch(0.45 0.04 210)',
				'--widget-calendar-available': 'oklch(0.52 0.05 210)',
				'--widget-calendar-selected': 'oklch(0.7 0.1 200)',
				
				// TIME SLOT VARIABLES
				'--widget-time-slot-bg': 'oklch(0.42 0.04 210)',
				'--widget-time-slot-hover': 'oklch(0.5 0.05 210)',
				'--widget-time-slot-selected': 'oklch(0.7 0.1 200)',
				
				// DESIGN SYSTEM VARIABLES
				'--widget-font-family': 'Inter, system-ui, sans-serif',
				'--widget-border-radius': '8px',
				'--widget-border-radius-small': '6px',
				'--widget-border-radius-large': '12px',
				'--widget-spacing-xs': '4px',
				'--widget-spacing-sm': '8px',
				'--widget-spacing-md': '16px',
				'--widget-spacing-lg': '24px',
				'--widget-spacing-xl': '32px',
				'--widget-shadow': '0 1px 3px rgba(0, 0, 0, 0.2)',
				'--widget-shadow-md': '0 4px 6px rgba(0, 0, 0, 0.2)',
				'--widget-shadow-lg': '0 10px 25px rgba(0, 0, 0, 0.3)'
			}
		},
		green: {
			light: {
				// SIDEBAR VARIABLES
				'--widget-sidebar-bg': 'oklch(0.98 0.01 150)',
				'--widget-sidebar-text': 'oklch(0.35 0.03 150)',
				'--widget-sidebar-text-muted': 'oklch(0.55 0.02 150)',
				'--widget-sidebar-accent': 'oklch(0.67 0.08 150)',
				'--widget-sidebar-border': 'oklch(0.92 0.02 150)',
				
				// CONTENT VARIABLES
				'--widget-content-bg': 'oklch(0.995 0.005 150)',
				'--widget-content-text': 'oklch(0.1 0.02 150)',
				'--widget-content-text-muted': 'oklch(0.4 0.02 150)',
				
				// INPUT VARIABLES
				'--widget-input-bg': 'oklch(0.99 0.008 150)',
				'--widget-input-border': 'oklch(0.87 0.02 150)',
				
				// ACCENT VARIABLES
				'--widget-accent': 'oklch(0.67 0.08 150)',
				'--widget-accent-hover': 'oklch(0.62 0.1 150)',
				'--widget-accent-rgb': '102, 204, 153',
				
				// STATE VARIABLES
				'--widget-success': 'oklch(0.4 0.15 150)',
				'--widget-error': 'oklch(0.55 0.2 15)',
				
				// CALENDAR VARIABLES
				'--widget-calendar-bg': 'oklch(0.96 0.015 150)',
				'--widget-calendar-available': 'oklch(0.9 0.02 150)',
				'--widget-calendar-selected': 'oklch(0.67 0.08 150)',
				
				// TIME SLOT VARIABLES
				'--widget-time-slot-bg': 'oklch(0.94 0.015 150)',
				'--widget-time-slot-hover': 'oklch(0.88 0.025 150)',
				'--widget-time-slot-selected': 'oklch(0.67 0.08 150)',
				
				// DESIGN SYSTEM VARIABLES
				'--widget-font-family': 'Poppins, system-ui, sans-serif',
				'--widget-border-radius': '12px',
				'--widget-border-radius-small': '8px',
				'--widget-border-radius-large': '16px',
				'--widget-spacing-xs': '6px',
				'--widget-spacing-sm': '12px',
				'--widget-spacing-md': '20px',
				'--widget-spacing-lg': '28px',
				'--widget-spacing-xl': '36px',
				'--widget-shadow': '0 2px 4px rgba(0, 0, 0, 0.08)',
				'--widget-shadow-md': '0 6px 8px rgba(0, 0, 0, 0.08)',
				'--widget-shadow-lg': '0 12px 30px rgba(0, 0, 0, 0.12)'
			},
			dark: {
				// SIDEBAR VARIABLES
				'--widget-sidebar-bg': 'oklch(0.12 0.003 170)',
				'--widget-sidebar-text': 'oklch(0.78 0.08 140)',
				'--widget-sidebar-text-muted': 'oklch(0.65 0.06 140)',
				'--widget-sidebar-accent': 'oklch(0.78 0.08 140)',
				'--widget-sidebar-border': 'oklch(0.2 0.01 170)',
				
				// CONTENT VARIABLES
				'--widget-content-bg': 'oklch(0.18 0.02 150)',
				'--widget-content-text': 'oklch(0.85 0.08 140)',
				'--widget-content-text-muted': 'oklch(0.75 0.06 140)',
				
				// INPUT VARIABLES
				'--widget-input-bg': 'oklch(0.45 0.04 140)',
				'--widget-input-border': 'oklch(0.55 0.05 140)',
				
				// ACCENT VARIABLES
				'--widget-accent': 'oklch(0.7 0.1 120)',
				'--widget-accent-hover': 'oklch(0.75 0.12 120)',
				'--widget-accent-rgb': '102, 179, 153',
				
				// STATE VARIABLES
				'--widget-success': 'oklch(0.5 0.15 150)',
				'--widget-error': 'oklch(0.6 0.2 15)',
				
				// CALENDAR VARIABLES
				'--widget-calendar-bg': 'oklch(0.45 0.04 140)',
				'--widget-calendar-available': 'oklch(0.52 0.05 140)',
				'--widget-calendar-selected': 'oklch(0.7 0.1 120)',
				
				// TIME SLOT VARIABLES
				'--widget-time-slot-bg': 'oklch(0.42 0.04 140)',
				'--widget-time-slot-hover': 'oklch(0.5 0.05 140)',
				'--widget-time-slot-selected': 'oklch(0.7 0.1 120)',
				'--widget-font-family': 'Poppins, system-ui, sans-serif',
				'--widget-border-radius': '12px',
				'--widget-border-radius-small': '8px',
				'--widget-border-radius-large': '16px',
				'--widget-spacing-xs': '6px',
				'--widget-spacing-sm': '12px',
				'--widget-spacing-md': '20px',
				'--widget-spacing-lg': '28px',
				'--widget-spacing-xl': '36px',
				'--widget-shadow': '0 2px 4px rgba(0, 0, 0, 0.15)',
				'--widget-shadow-md': '0 6px 8px rgba(0, 0, 0, 0.18)',
				'--widget-shadow-lg': '0 12px 30px rgba(0, 0, 0, 0.25)'
			}
		},
		purple: {
			light: {
				'--widget-sidebar-bg': 'oklch(0.98 0.01 290)',
				'--widget-sidebar-text': 'oklch(0.35 0.03 290)',
				'--widget-sidebar-text-muted': 'oklch(0.55 0.02 290)',
				'--widget-sidebar-accent': 'oklch(0.67 0.08 290)',
				'--widget-sidebar-border': 'oklch(0.92 0.02 290)',
				'--widget-content-bg': 'oklch(0.995 0.005 290)',
				'--widget-content-text': 'oklch(0.1 0.02 290)',
				'--widget-content-text-muted': 'oklch(0.4 0.02 290)',
				'--widget-input-bg': 'oklch(0.99 0.008 290)',
				'--widget-input-border': 'oklch(0.87 0.02 290)',
				'--widget-accent': 'oklch(0.67 0.08 290)',
				'--widget-accent-hover': 'oklch(0.62 0.1 290)',
				'--widget-calendar-bg': 'oklch(0.96 0.015 290)',
				'--widget-calendar-available': 'oklch(0.9 0.02 290)',
				'--widget-calendar-selected': 'oklch(0.67 0.08 290)',
				'--widget-time-slot-bg': 'oklch(0.94 0.015 290)',
				'--widget-time-slot-hover': 'oklch(0.88 0.025 290)',
				'--widget-time-slot-selected': 'oklch(0.67 0.08 290)',
				'--widget-font-family': 'Playfair Display, Georgia, serif',
				'--widget-border-radius': '4px',
				'--widget-border-radius-small': '2px',
				'--widget-border-radius-large': '8px',
				'--widget-spacing-xs': '3px',
				'--widget-spacing-sm': '6px',
				'--widget-spacing-md': '12px',
				'--widget-spacing-lg': '18px',
				'--widget-spacing-xl': '24px',
				'--widget-shadow': '0 1px 2px rgba(0, 0, 0, 0.15)',
				'--widget-shadow-md': '0 3px 5px rgba(0, 0, 0, 0.15)',
				'--widget-shadow-lg': '0 8px 20px rgba(0, 0, 0, 0.18)'
			},
			dark: {
				'--widget-sidebar-bg': 'oklch(0.12 0.003 310)',
				'--widget-sidebar-text': 'oklch(0.78 0.08 280)',
				'--widget-sidebar-text-muted': 'oklch(0.65 0.06 280)',
				'--widget-sidebar-accent': 'oklch(0.78 0.08 280)',
				'--widget-sidebar-border': 'oklch(0.2 0.01 310)',
				'--widget-content-bg': 'oklch(0.48 0.04 280)',
				'--widget-content-text': 'oklch(0.85 0.08 280)',
				'--widget-content-text-muted': 'oklch(0.75 0.06 280)',
				'--widget-input-bg': 'oklch(0.45 0.04 280)',
				'--widget-input-border': 'oklch(0.55 0.05 280)',
				'--widget-accent': 'oklch(0.7 0.1 260)',
				'--widget-accent-hover': 'oklch(0.15 0.01 0)',
				'--widget-calendar-bg': 'oklch(0.45 0.04 280)',
				'--widget-calendar-available': 'oklch(0.52 0.05 280)',
				'--widget-calendar-selected': 'oklch(0.1 0.01 0)',
				'--widget-time-slot-bg': 'oklch(0.42 0.04 280)',
				'--widget-time-slot-hover': 'oklch(0.5 0.05 280)',
				'--widget-time-slot-selected': 'oklch(0.1 0.01 0)',
				'--widget-font-family': 'Playfair Display, Georgia, serif',
				'--widget-border-radius': '4px',
				'--widget-border-radius-small': '2px',
				'--widget-border-radius-large': '8px',
				'--widget-spacing-xs': '3px',
				'--widget-spacing-sm': '6px',
				'--widget-spacing-md': '12px',
				'--widget-spacing-lg': '18px',
				'--widget-spacing-xl': '24px',
				'--widget-shadow': '0 1px 2px rgba(0, 0, 0, 0.25)',
				'--widget-shadow-md': '0 3px 5px rgba(0, 0, 0, 0.25)',
				'--widget-shadow-lg': '0 8px 20px rgba(0, 0, 0, 0.35)'
			}
		},
		pink: {
			light: {
				'--widget-sidebar-bg': 'oklch(0.98 0.01 330)',
				'--widget-sidebar-text': 'oklch(0.35 0.03 330)',
				'--widget-sidebar-text-muted': 'oklch(0.55 0.02 330)',
				'--widget-sidebar-accent': 'oklch(0.67 0.08 330)',
				'--widget-sidebar-border': 'oklch(0.92 0.02 330)',
				'--widget-content-bg': 'oklch(0.995 0.005 330)',
				'--widget-content-text': 'oklch(0.1 0.02 330)',
				'--widget-content-text-muted': 'oklch(0.4 0.02 330)',
				'--widget-input-bg': 'oklch(0.99 0.008 330)',
				'--widget-input-border': 'oklch(0.87 0.02 330)',
				'--widget-accent': 'oklch(0.67 0.08 330)',
				'--widget-accent-hover': 'oklch(0.62 0.1 330)',
				'--widget-calendar-bg': 'oklch(0.96 0.015 330)',
				'--widget-calendar-available': 'oklch(0.9 0.02 330)',
				'--widget-calendar-selected': 'oklch(0.67 0.08 330)',
				'--widget-time-slot-bg': 'oklch(0.94 0.015 330)',
				'--widget-time-slot-hover': 'oklch(0.88 0.025 330)',
				'--widget-time-slot-selected': 'oklch(0.67 0.08 330)',
				'--widget-font-family': 'Dancing Script, cursive',
				'--widget-border-radius': '20px',
				'--widget-border-radius-small': '15px',
				'--widget-border-radius-large': '30px',
				'--widget-spacing-xs': '5px',
				'--widget-spacing-sm': '10px',
				'--widget-spacing-md': '18px',
				'--widget-spacing-lg': '26px',
				'--widget-spacing-xl': '35px',
				'--widget-shadow': '0 2px 8px rgba(255, 105, 180, 0.2)',
				'--widget-shadow-md': '0 6px 16px rgba(255, 105, 180, 0.25)',
				'--widget-shadow-lg': '0 12px 32px rgba(255, 105, 180, 0.3)'
			},
			dark: {
				'--widget-sidebar-bg': 'oklch(0.12 0.003 350)',
				'--widget-sidebar-text': 'oklch(0.78 0.08 320)',
				'--widget-sidebar-text-muted': 'oklch(0.65 0.06 320)',
				'--widget-sidebar-accent': 'oklch(0.78 0.08 320)',
				'--widget-sidebar-border': 'oklch(0.2 0.01 350)',
				'--widget-content-bg': 'oklch(0.48 0.04 320)',
				'--widget-content-text': 'oklch(0.85 0.08 320)',
				'--widget-content-text-muted': 'oklch(0.75 0.06 320)',
				'--widget-input-bg': 'oklch(0.45 0.04 320)',
				'--widget-input-border': 'oklch(0.55 0.05 320)',
				'--widget-accent': 'oklch(0.7 0.1 300)',
				'--widget-accent-hover': 'oklch(0.15 0.01 0)',
				'--widget-calendar-bg': 'oklch(0.45 0.04 320)',
				'--widget-calendar-available': 'oklch(0.52 0.05 320)',
				'--widget-calendar-selected': 'oklch(0.1 0.01 0)',
				'--widget-time-slot-bg': 'oklch(0.42 0.04 320)',
				'--widget-time-slot-hover': 'oklch(0.5 0.05 320)',
				'--widget-time-slot-selected': 'oklch(0.1 0.01 0)',
				'--widget-font-family': 'Dancing Script, cursive',
				'--widget-border-radius': '20px',
				'--widget-border-radius-small': '15px',
				'--widget-border-radius-large': '30px',
				'--widget-spacing-xs': '5px',
				'--widget-spacing-sm': '10px',
				'--widget-spacing-md': '18px',
				'--widget-spacing-lg': '26px',
				'--widget-spacing-xl': '35px',
				'--widget-shadow': '0 2px 8px rgba(255, 105, 180, 0.4)',
				'--widget-shadow-md': '0 6px 16px rgba(255, 105, 180, 0.45)',
				'--widget-shadow-lg': '0 12px 32px rgba(255, 105, 180, 0.5)'
			}
		},

		wood: {
			light: {
				'--widget-sidebar-bg': 'oklch(0.98 0.01 55)',
				'--widget-sidebar-text': 'oklch(0.35 0.03 55)',
				'--widget-sidebar-text-muted': 'oklch(0.55 0.02 55)',
				'--widget-sidebar-accent': 'oklch(0.67 0.08 55)',
				'--widget-sidebar-border': 'oklch(0.92 0.02 55)',
				'--widget-content-bg': 'oklch(0.995 0.005 55)',
				'--widget-content-text': 'oklch(0.1 0.02 55)',
				'--widget-content-text-muted': 'oklch(0.4 0.02 55)',
				'--widget-input-bg': 'oklch(0.99 0.008 55)',
				'--widget-input-border': 'oklch(0.87 0.02 55)',
				'--widget-accent': 'oklch(0.67 0.08 55)',
				'--widget-accent-hover': 'oklch(0.62 0.1 55)',
				'--widget-calendar-bg': 'oklch(0.96 0.015 55)',
				'--widget-calendar-available': 'oklch(0.9 0.02 55)',
				'--widget-calendar-selected': 'oklch(0.67 0.08 55)',
				'--widget-time-slot-bg': 'oklch(0.94 0.015 55)',
				'--widget-time-slot-hover': 'oklch(0.88 0.025 55)',
				'--widget-time-slot-selected': 'oklch(0.67 0.08 55)',
				'--widget-font-family': 'Inter, system-ui, sans-serif',
				'--widget-border-radius': '2px',
				'--widget-border-radius-small': '1px',
				'--widget-border-radius-large': '4px',
				'--widget-spacing-xs': '2px',
				'--widget-spacing-sm': '4px',
				'--widget-spacing-md': '8px',
				'--widget-spacing-lg': '12px',
				'--widget-spacing-xl': '16px',
				'--widget-shadow': '0 1px 2px rgba(101, 67, 33, 0.2)',
				'--widget-shadow-md': '0 2px 4px rgba(101, 67, 33, 0.25)',
				'--widget-shadow-lg': '0 4px 12px rgba(101, 67, 33, 0.3)'
			},
			dark: {
				'--widget-sidebar-bg': 'oklch(0.2389 0.0019 106.54)',
				'--widget-sidebar-text': 'oklch(0.78 0.08 75)',
				'--widget-sidebar-text-muted': 'oklch(0.65 0.06 75)',
				'--widget-sidebar-accent': 'oklch(0.78 0.08 75)',
				'--widget-sidebar-border': 'oklch(0.2 0.01 65)',
				'--widget-content-bg': 'oklch(0.5642 0.0299 87.89)',
				'--widget-content-text': 'oklch(1 0 5)',
				'--widget-content-text-muted': 'oklch(0.8 0 87.72)',
				'--widget-input-bg': 'oklch(0.75 0.02 75)',
				'--widget-input-border': 'oklch(0.55 0.05 75)',
				'--widget-accent': 'oklch(0.7 0.1 86)',
				'--widget-accent-hover': 'oklch(0.15 0.01 0)',
				'--widget-calendar-bg': 'oklch(0.72 0.02 75)',
				'--widget-calendar-available': 'oklch(0.68 0.03 75)',
				'--widget-calendar-selected': 'oklch(0.1 0.01 0)',
				'--widget-time-slot-bg': 'oklch(0.7 0.02 75)',
				'--widget-time-slot-hover': 'oklch(0.65 0.03 75)',
				'--widget-time-slot-selected': 'oklch(0.1 0.01 0)',
				'--widget-font-family': 'Inter, system-ui, sans-serif',
				'--widget-border-radius': '2px',
				'--widget-border-radius-small': '1px',
				'--widget-border-radius-large': '4px',
				'--widget-spacing-xs': '2px',
				'--widget-spacing-sm': '4px',
				'--widget-spacing-md': '8px',
				'--widget-spacing-lg': '12px',
				'--widget-spacing-xl': '16px',
				'--widget-shadow': '0 1px 2px rgba(101, 67, 33, 0.4)',
				'--widget-shadow-md': '0 2px 4px rgba(101, 67, 33, 0.5)',
				'--widget-shadow-lg': '0 4px 12px rgba(101, 67, 33, 0.6)'
			}
		}
	};

	function applyTheme(theme: string, mode: 'light' | 'dark') {
		const themeColors = colorThemes[theme as keyof typeof colorThemes];
		if (!themeColors) return;

		const colors = themeColors[mode];
		if (!colors) return;

		// Apply CSS variables to the root element
		Object.entries(colors).forEach(([property, value]) => {
			document.documentElement.style.setProperty(property, value);
		});
	}

	// Watch for theme changes
	$effect(() => {
		const isDark = document.documentElement.classList.contains('dark');
		applyTheme(colorTheme, isDark ? 'dark' : 'light');
	});

	onMount(() => {
		// Listen for dark mode changes
		const observer = new MutationObserver(() => {
			const isDark = document.documentElement.classList.contains('dark');
			applyTheme(colorTheme, isDark ? 'dark' : 'light');
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Initial theme application
		const isDark = document.documentElement.classList.contains('dark');
		applyTheme(colorTheme, isDark ? 'dark' : 'light');

		return () => observer.disconnect();
	});
</script>

{@render children()}
