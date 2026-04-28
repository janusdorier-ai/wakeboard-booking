import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // CNV brand palette — sourced from cnv.ch pennant flag
        cnv: {
          navy:    '#14305f',  // primary navy (logo + body text on light bg)
          'navy-2':'#1e3a8a',  // mid navy
          'navy-3':'#0a1c3d',  // deep navy (dark bg base)
          'navy-4':'#050d23',  // near-black navy (page bg)
          yellow:  '#fbbf24',  // pennant yellow — neon accent on dark
          red:     '#dc2626',  // pennant red
          ink:     '#e2e8f0',  // primary text on dark
          dim:     '#64748b',  // secondary text on dark
        },
      },
    },
  },
  plugins: [],
}
export default config
