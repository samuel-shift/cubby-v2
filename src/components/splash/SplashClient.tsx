"use client";

/**
 * Splash Screen — LOW priority
 * Auto-redirects to /onboarding after 3.5s
 * Dancing food characters: TomatoBean, CarrotBean, AvocadoBean, EggBean, BreadBean
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const BEANS = [
  { emoji: "🍅", label: "TomatoBean", delay: 0 },
  { emoji: "🥕", label: "CarrotBean", delay: 0.1 },
  { emoji: "🥑", label: "AvocadoBean", delay: 0.2 },
  { emoji: "🥚", label: "EggBean", delay: 0.3 },
  { emoji: "🍞", label: "BreadBean", delay: 0.4 },
];

export function SplashClient() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/onboarding"), 3500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cubby-stone gap-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <div className="w-16 h-16 rounded-card bg-cubby-green flex items-center justify-center">
          <span className="text-white text-3xl font-black">C</span>
        </div>
        <span className="text-4xl font-black text-cubby-charcoal">cubby</span>
      </motion.div>

      {/* Dancing food characters */}
      <div className="flex items-end gap-3">
        {BEANS.map((bean, i) => (
          <motion.div
            key={bean.label}
            initial={{ y: 0 }}
            animate={{ y: [0, -20, 0] }}
            transition={{
              delay: bean.delay,
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 0.8,
              ease: "easeInOut",
            }}
          >
            <span
              className="text-4xl select-none"
              style={{ display: "inline-block" }}
              role="img"
              aria-label={bean.label}
            >
              {bean.emoji}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-cubby-taupe font-semibold text-sm"
      >
        Your food waste fighter
      </motion.p>
    </div>
  );
}
