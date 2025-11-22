/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       animation: {
         popIn: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
         // เพิ่มท่าบิน 3 แบบ
         'float-slow': 'float 8s ease-in-out infinite',
         'float-medium': 'float 6s ease-in-out infinite reverse',
         'float-fast': 'float 7s ease-in-out infinite',
         'wander': 'wander 20s linear infinite', // บินวนทั่วๆ
         'text-shimmer': 'textShimmer 2.5s ease-in-out infinite alternate',
         'float-icon': 'floatIcon 3s ease-in-out infinite',
       },
       keyframes: {
         popIn: {
           '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' },
           '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
         },
         float: {
            '0%, 100%': { transform: 'translateY(0) translateX(0)' },
            '33%': { transform: 'translateY(-30px) translateX(20px)' },
            '66%': { transform: 'translateY(20px) translateX(-20px)' },
         },
         wander: {
            '0%': { transform: 'translate(0,0) rotate(0deg)' },
            '25%': { transform: 'translate(50px, -50px) rotate(5deg)' },
            '50%': { transform: 'translate(-30px, 80px) rotate(-5deg)' },
            '75%': { transform: 'translate(-60px, -30px) rotate(3deg)' },
            '100%': { transform: 'translate(0,0) rotate(0deg)' },
         },
         textShimmer: {
           '0%': { opacity: 0.7, letterSpacing: '0px' },
           '100%': { opacity: 1, letterSpacing: '1px' }, // ตัวหนังสือจะขยายออกนิดๆ หายใจได้
         },
         floatIcon: {
            '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
            '50%': { transform: 'translateY(-4px) rotate(5deg)' }, // ลอยขึ้นและเอียงนิดหน่อย
         }
       }
    },
  },
  plugins: [],
}