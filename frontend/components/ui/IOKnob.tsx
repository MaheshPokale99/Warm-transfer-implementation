import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface IOKnobProps {
    value?: boolean;
    defaultValue?: boolean;
    onChange?: (next: boolean) => void;
    size?: number;
    colorOff?: string;
    colorOn?: string;
    knobFrom?: string;
    knobTo?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
}

const IOKnob: React.FC<IOKnobProps> = ({
    value,
    defaultValue = false,
    onChange,
    size = 50,
    colorOff = "#E5E7EB",
    colorOn = "#3B82F6",
    knobFrom = "#F9FAFB",
    knobTo = "#F3F4F6",
    disabled = false,
    className = "",
    label,
}) => {
    const [internal, setInternal] = useState(defaultValue);
    const isControlled = value !== undefined;
    const isOn = isControlled ? (value as boolean) : internal;

    const knobSize = size * 0.80;
    const pad = (size - knobSize) / 2;
    const trackWidth = size * 2;
    const knobX = isOn ? trackWidth - knobSize - pad : pad;

    const toggle = () => {
        if (disabled) return;
        const next = !isOn;
        if (!isControlled) setInternal(next);
        onChange?.(next);
    };

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            {label && (
                <span className="text-sm font-medium text-zinc-300">
                    {label}
                </span>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={isOn}
                disabled={disabled}
                onClick={toggle}
                className={`relative rounded-full flex items-center justify-between select-none ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    }`}
                style={{
                    width: trackWidth,
                    height: size,
                    backgroundColor: isOn ? colorOn : colorOff,
                    boxShadow: "inset 0px 1px 2px rgba(255,255,255,0.35)",
                    overflow: "hidden",
                }}
            >
                <AnimatePresence>
                    {isOn && (
                        <motion.span
                            key="bar"
                            initial={{ x: -size * 0.8, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -size * 0.8, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 60,
                                mass: 1
                            }}
                            className="absolute rounded-sm"
                            style={{
                                width: size * 0.05,
                                height: size * 0.5,
                                left: size * 0.45,
                                backgroundColor: "#FFFFFF",
                            }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait" initial={false}>
                    {!isOn && (
                        <motion.span
                            key="ring"
                            initial={{ x: size * 0.5, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: size * 0.8, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 60,
                                mass: 1
                            }}
                            className="absolute rounded-full border-4 border-solid border-white"
                            style={{
                                width: size * 0.45,
                                height: size * 0.45,
                                right: size * 0.25,
                                borderWidth: `${size * 0.075}px`
                            }}
                        />
                    )}
                </AnimatePresence>

                <motion.span
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 60,
                        mass: 1
                    }}
                    className="absolute rounded-full"
                    style={{
                        top: pad,
                        left: knobX,
                        width: knobSize,
                        height: knobSize,
                        backgroundImage: `linear-gradient(to bottom, ${knobFrom}, ${knobTo})`,
                        boxShadow: "inset 0px 1px 2px rgba(255,255,255,0.8), 0px 8px 20px rgba(0,0,0,0.25)",
                    }}
                />
            </button>
        </div>
    );
};

export default IOKnob;
