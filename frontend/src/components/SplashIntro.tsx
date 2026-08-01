"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SHOP_NAME = "RR Stationery";
const SPLASH_STORAGE_KEY = "stationery_erp_seen_splash";

export default function SplashIntro() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showPortraitContent, setShowPortraitContent] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  function startSequence() {
    setIsFlipping(false);
    setShowPortraitContent(false);
    setIsVisible(true);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
    }
  }

  useEffect(() => {
    // Check if user already saw splash in this session
    const seen = sessionStorage.getItem(SPLASH_STORAGE_KEY);
    if (!seen) {
      startSequence();
    }

    // Listen for custom trigger to replay intro anytime
    function handleReplay() {
      sessionStorage.removeItem(SPLASH_STORAGE_KEY);
      startSequence();
    }

    window.addEventListener("play_splash_intro", handleReplay);
    return () => {
      window.removeEventListener("play_splash_intro", handleReplay);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Dismiss via Escape key
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    if (isReducedMotion) {
      // Reduced motion fallback: show final logo state briefly, then dismiss
      const timer = setTimeout(() => {
        dismiss();
      }, 1200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

    // Standard Animation Sequence:
    // 0.0s – 0.8s: Gold SVG Ring draws on
    // 0.8s – 1.8s: Founder Portrait image & name letters fade in
    // 1.8s – 2.3s: Hold
    // 2.3s – 3.3s: 3D Coin-Flip to Back Face RR Logo
    // 3.3s – 4.0s: Fade out overlay & dismiss

    const t1 = setTimeout(() => setShowPortraitContent(true), 800);
    const t2 = setTimeout(() => setIsFlipping(true), 2300);
    const t3 = setTimeout(() => dismiss(), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, isReducedMotion]);

  function dismiss() {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
    localStorage.setItem(SPLASH_STORAGE_KEY, "true");
    setIsVisible(false);
  }

  if (!isVisible) return null;

  const letterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.04,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          onClick={dismiss}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-charcoal-950 p-4 font-body select-none cursor-pointer"
        >
          {/* Skip Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="absolute top-6 right-6 text-xs font-ledger text-steel-400 hover:text-brass-300 transition py-1.5 px-4 rounded-control border border-steel-600/40 bg-charcoal-900/90 z-50 cursor-pointer shadow-lg flex items-center gap-1.5"
          >
            <span>Skip Intro</span>
            <span>✕</span>
          </button>

          {/* Reduced Motion Simplified View */}
          {isReducedMotion ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-48 w-48 rounded-full border-2 border-brass-500/60 shadow-brass-glow overflow-hidden bg-charcoal-900 flex items-center justify-center p-2">
                <img
                  src="/brand/rr-logo.png"
                  alt={SHOP_NAME}
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
              <h2 className="font-display text-xl font-bold text-parchment tracking-wide">
                {SHOP_NAME}
              </h2>
            </div>
          ) : (
            /* 3D Coin-Flip Animation Container */
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 perspective-[1000px]">
                <motion.div
                  animate={{ rotateY: isFlipping ? 180 : 0 }}
                  transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                  className="w-full h-full relative preserve-3d"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* FRONT FACE: Founder Greeting & Ribbon Name */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-charcoal-900 border border-brass-700/30 shadow-brass-glow overflow-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {/* SVG Gold Ring Stroke Draw */}
                    <svg
                      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                      viewBox="0 0 280 280"
                    >
                      <motion.circle
                        cx="140"
                        cy="140"
                        r="134"
                        fill="none"
                        stroke="url(#brassGradient)"
                        strokeWidth="4"
                        strokeDasharray="841.9"
                        initial={{ strokeDashoffset: 841.9 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                      <defs>
                        <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E4C766" />
                          <stop offset="50%" stopColor="#C9A227" />
                          <stop offset="100%" stopColor="#8A6B12" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Founder Portrait Image */}
                    {showPortraitContent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-full relative flex flex-col items-center justify-center"
                      >
                        <img
                          src="/brand/founder-greeting.png"
                          alt="Welcome Greeting"
                          className="w-full h-full object-cover rounded-full"
                        />

                        {/* Staggered Ribbon Shop Name Overlay */}
                        <div className="absolute bottom-6 left-0 right-0 px-4 text-center z-20">
                          <div className="inline-flex justify-center items-center bg-charcoal-950/85 backdrop-blur-sm border border-brass-500/60 px-4 py-1 rounded-full shadow-embossed">
                            {SHOP_NAME.split("").map((char, index) => (
                              <motion.span
                                key={index}
                                custom={index}
                                initial="hidden"
                                animate="visible"
                                variants={letterVariants}
                                className="font-ledger text-xs font-bold text-brass-300 tracking-wider inline-block"
                              >
                                {char === " " ? "\u00A0" : char}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* BACK FACE: Shop Monogram Logo */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-charcoal-900 border-2 border-brass-500/50 shadow-brass-glow overflow-hidden p-3"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <img
                      src="/brand/rr-logo.png"
                      alt={SHOP_NAME}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Caption hint */}
              <p className="mt-6 text-xs text-steel-400 font-ledger tracking-widest uppercase opacity-70 animate-pulse">
                Smart Stationery ERP
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
