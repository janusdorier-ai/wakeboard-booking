import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // CNV brand palette — sourced from cnv.ch pennant flag
        cnv: {
          navy:    '#14305f',   // primary navy
          'navy-2':'#1e3a8a',   // mid navy
          'navy-3':'#0a1c3d',   // deep navy (card surfaces)
          'navy-4':'#050d23',   // near-black navy (page bg)
          yellow:  '#fbbf24',   // pennant yellow — star accent
          red:     '#dc2626',   // pennant red
          ink:     '#e2e8f0',   // primary text on dark
          dim:     '#64748b',   // secondary text on dark
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-yellow': '0 0 24px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.12)',
        'glow-yellow-sm': '0 0 12px rgba(251,191,36,0.25)',
        'glow-emerald': '0 0 16px rgba(52,211,153,0.3)',
      },
    },
  },
  plugins: [],
}
export default config
