'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MainButtonProps {
  name: string;
  href?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

const MainButton: React.FC<MainButtonProps> = ({ name, href = '', variant = 'dark', size = 'md', onClick, disabled = false }) => {
  const buttonContent = (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ y: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 60,
        mass: 1,
        delay: 0,
      }}
      className={`
        inline-flex justify-center items-center rounded-[20px]
        font-semibold transition-all duration-300
        w-full sm:w-auto text-center
        border border-white/5 hover:border-white/10
        ${size === 'sm' ? 'py-3 px-6 text-sm' :
          size === 'lg' ? 'py-6 px-12 text-xl' :
            'py-4 px-8 text-base'}
        ${disabled 
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          : variant === 'dark'
            ? 'bg-[#0D0D0D] text-white hover:bg-[#1a1a1a] cursor-pointer'
            : 'bg-white text-black hover:bg-gray-50 cursor-pointer'
        }
        shadow-[inset_0px_2px_0px_0px_rgba(184,180,180,0.08)]
        ${!disabled ? 'hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]' : ''}
      `}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}
    >
      {name}
    </motion.button>
  );

  if (href) {
    return (
      <a href={href}>
        {buttonContent}
      </a>
    );
  }

  return buttonContent;
};

export default MainButton;