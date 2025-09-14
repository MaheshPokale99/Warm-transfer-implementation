import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

export interface BlurTextRevealProps {
  text: string;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  blur?: number;
  duration?: number;
  stagger?: number;
  bounce?: number;
  once?: boolean;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

const BlurTextReveal: React.FC<BlurTextRevealProps> = ({
  text,
  className = "",
  direction = "up",
  blur = 10,
  duration = 0.4,
  stagger = 0.05,
  bounce = 0,
  once = true,
  color = "text-zinc-800 dark:text-zinc-200",
  fontSize = "text-xl",
  fontWeight = "font-normal",
}) => {
  if (!text || typeof text !== "string") return null;

  const offset =
    direction === "up"
      ? 10
      : direction === "down"
      ? -10
      : direction === "left"
      ? 10
      : -10;

  const letterAnimation: Variants = {
    hidden: {
      opacity: 0,
      x: direction === "left" || direction === "right" ? offset : 0,
      y: direction === "up" || direction === "down" ? offset : 0,
      filter: `blur(${blur}px)`,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        duration,
        bounce,
      },
    },
  };

  const containerAnimation: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
      },
    },
  };

  return (
    <motion.div
      variants={containerAnimation}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.3 }}
      className={`flex flex-wrap ${className}`}
    >
      {text.split(" ").map((word, wordIndex) => (
        <motion.span
          key={wordIndex}
          className={`inline-block mr-2 ${color} ${fontSize} ${fontWeight}`}
        >
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={`${wordIndex}-${charIndex}`}
              variants={letterAnimation}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default BlurTextReveal;
