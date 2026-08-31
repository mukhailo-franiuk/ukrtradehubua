"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, ShoppingBag, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 bg-[#0b0f17] text-white select-none">
      
      {/* Анімована композиція з великими цифрами */}
      <div className="relative flex items-center justify-center mb-4">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="text-[120px] sm:text-[180px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-800 via-gray-900 to-[#0b0f17] leading-none"
        >
          404
        </motion.h1>

        {/* Літаючий фірмовий знак маркетплейса замість нуля або як центральний акцент */}
        <motion.div 
          className="absolute"
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-[0_0_25px_rgba(245,158,11,0.2)]" fill="none" xmlns="http://w3.org">
            <path d="M15 25L50 85L85 25H15Z" fill="rgba(245, 158, 11, 0.03)" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="2" />
            <path d="M15 25L50 85L50 45L15 25Z" fill="#fbbf24" />
            <path d="M85 25L50 85L50 45L85 25Z" fill="#f59e0b" />
            <circle cx="50" cy="20" r="5" fill="#f43f5e" />
          </svg>
        </motion.div>
      </div>

      {/* Текстовий блок попередження */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center max-w-md"
      >
        <h2 className="text-xl sm:text-2xl font-black mb-2 uppercase tracking-wide text-amber-400">
          Упс! Сторінку не знайдено
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 font-medium mb-8 leading-relaxed">
          Можливо, ця сторінка була видалена, перейменована, або адреса містить помилку. Давайте повернемося до покупок!
        </p>
      </motion.div>

      {/* Навігаційна панель швидких кнопок */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none justify-center font-bold text-xs"
      >
        {/* Головна кнопка дії */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-md transition shadow-md w-full sm:w-auto"
          >
            <Home size={16} />
            <span>На головну</span>
          </Link>
        </motion.div>

        {/* Додаткові посилання */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link 
            href="/catalog" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#121824] hover:bg-[#1a2332] text-gray-200 border border-gray-800 rounded-md transition w-full sm:w-auto"
          >
            <ShoppingBag size={16} />
            <span>Перейти до каталогу</span>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link 
            href="/help" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent hover:bg-gray-900 text-gray-400 hover:text-gray-200 transition w-full sm:w-auto"
          >
            <HelpCircle size={16} />
            <span>Підтримка</span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
