import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface CountdownOverlayProps {
  isVisible: boolean;
  message: string;
  estimatedSeconds?: number;
  compact?: boolean;
}

export function CountdownOverlay({ isVisible, message, estimatedSeconds = 10, compact = false }: CountdownOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(estimatedSeconds);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(estimatedSeconds);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 1 ? prev - 1 : 1)); // Stop at 1 until actually done
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isVisible, estimatedSeconds]);

  // Calculate circumference for SVG circle (2 * pi * r)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * ((estimatedSeconds - timeLeft) / estimatedSeconds));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm rounded-[inherit]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`bg-[var(--card-bg)] border border-[var(--border)] ${compact ? 'p-4 gap-3' : 'p-8 gap-6'} rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-sm w-[90%] relative overflow-hidden`}
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full" />
            
            <div className={`relative flex items-center justify-center ${compact ? 'w-20 h-20' : 'w-32 h-32'}`}>
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx={compact ? "40" : "64"}
                  cy={compact ? "40" : "64"}
                  r={compact ? 36 : radius}
                  className="stroke-[var(--border)] fill-none"
                  strokeWidth={compact ? "3" : "4"}
                />
                <motion.circle
                  cx={compact ? "40" : "64"}
                  cy={compact ? "40" : "64"}
                  r={compact ? 36 : radius}
                  className="stroke-indigo-500 fill-none"
                  strokeWidth={compact ? "3" : "4"}
                  strokeLinecap="round"
                  strokeDasharray={compact ? 2 * Math.PI * 36 : circumference}
                  animate={{ strokeDashoffset: compact ? (2 * Math.PI * 36) - ((2 * Math.PI * 36) * ((estimatedSeconds - timeLeft) / estimatedSeconds)) : strokeDashoffset }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${compact ? 'text-2xl' : 'text-4xl'} font-black text-[var(--text)] tracking-tighter`}>
                  {timeLeft}
                </span>
                <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold text-indigo-400 uppercase tracking-widest`}>
                  SEC
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 text-center relative z-10">
              <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-[var(--text)] tracking-tight flex items-center gap-2`}>
                <Loader2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin text-indigo-500`} />
                {message}
              </h3>
              {!compact && (
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Please wait while we process your request. This might take a moment.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
