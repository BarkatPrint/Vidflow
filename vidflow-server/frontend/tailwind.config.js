export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['"Bebas Neue"','cursive'],
        mono:  ['"JetBrains Mono"','monospace'],
        sans:  ['"Space Grotesk"','sans-serif'],
      },
      colors: {
        bg:'#050608', s1:'#0c0e12', s2:'#12151c', s3:'#1a1e28',
        border:'#1f2535', border2:'#2a3045',
        red:'#ff2d55', red2:'#ff6b35',
        green:'#00f5a0', blue:'#0ea5e9',
        yellow:'#fbbf24', purple:'#a855f7',
        txt:'#e2e8f0', muted:'#4a5568', muted2:'#6b7280',
      },
      animation: {
        blink:  'blink 2s infinite',
        fadeUp: 'fadeUp 0.35s ease',
        shimmer:'shimmer 2.5s infinite linear',
      },
      keyframes: {
        blink:  { '0%,100%':{opacity:1},'50%':{opacity:0.3} },
        fadeUp: { from:{opacity:0,transform:'translateY(10px)'},to:{opacity:1,transform:'translateY(0)'} },
        shimmer:{ from:{transform:'translateX(-100%)'},to:{transform:'translateX(200%)'} },
      },
    },
  },
  plugins: [],
}