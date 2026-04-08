"use client";

/**
 * Onboarding — 6-Step Flow with AnimatePresence slide transitions
 *
 * Step 1: Login (email magic link)
 * Step 2: Name ("Hello, Chef!")
 * Step 3: Notifications (range slider 0-3)
 * Step 4: Dietary needs + allergens (merged, search-as-you-type + chips)
 * Step 5: Motivation (icon buttons)
 * Step 6: Welcome / finish CTA
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  Leaf, PiggyBank, Clock, Heart, Target, UtensilsCrossed, Mail
} from "lucide-react";

// ── SSO Provider Buttons ─────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

const TOTAL_STEPS = 6;

const DIETARY_OPTIONS = [
  "Vegan", "Vegetarian", "Pescatarian", "Gluten-free", "Dairy-free",
  "Nut-free", "Egg-free", "Halal", "Kosher", "Low FODMAP",
];

const ALLERGENS = [
  "Peanuts", "Tree nuts", "Milk", "Eggs", "Wheat", "Soy", "Fish", "Shellfish",
];

const MOTIVATIONS = [
  { id: "save-money", label: "Save money", icon: PiggyBank },
  { id: "reduce-waste", label: "Reduce waste", icon: Leaf },
  { id: "save-time", label: "Save time", icon: Clock },
  { id: "eat-better", label: "Eat better", icon: Heart },
  { id: "set-goals", label: "Hit goals", icon: Target },
  { id: "cook-more", label: "Cook more", icon: UtensilsCrossed },
];

const NOTIFICATION_LABELS = ["Never", "Once a week", "A few times", "Daily"];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function OnboardingClient() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notifFreq, setNotifFreq] = useState(1);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [dietarySearch, setDietarySearch] = useState("");
  const [motivations, setMotivations] = useState<string[]>([]);

  const goNext = () => {
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleEmailSubmit = async () => {
    setLoading(true);
    await signIn("resend", { email, redirect: false, callbackUrl: "/onboarding?step=2" });
    setLoading(false);
    goNext();
  };

  const handleFinish = async () => {
    setLoading(true);
    await fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, notificationFrequency: notifFreq, dietaryNeeds: selectedDietary, allergens: selectedAllergens, motivations }),
    });
    window.location.href = "/";
  };

  const filteredDietary = [...DIETARY_OPTIONS, ...ALLERGENS].filter((d) =>
    d.toLowerCase().includes(dietarySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-cubby-stone overflow-hidden">
      {/* Progress dots */}
      {step > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i < step - 1 ? "w-6 bg-cubby-green" : "w-1.5 bg-cubby-taupe/30"
              )}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex flex-col px-6 pt-8 pb-10"
          >
            {/* ── Step 1: Login ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center space-y-5">
                <div className="text-center space-y-2">
                  <div className="text-6xl mb-4">🥗</div>
                  <h1 className="text-page-title text-cubby-charcoal">Welcome to Cubby</h1>
                  <p className="text-cubby-taupe text-sm">Save food, save money. Sign in to get started.</p>
                </div>

                {/* SSO Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/onboarding?step=2" })}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-black/10 text-cubby-charcoal font-black rounded-2xl py-3.5 shadow-sm active:scale-[0.98] transition-all"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <button
                    onClick={() => signIn("apple", { callbackUrl: "/onboarding?step=2" })}
                    className="w-full flex items-center justify-center gap-3 bg-cubby-charcoal text-white font-black rounded-2xl py-3.5 shadow-sm active:scale-[0.98] transition-all"
                  >
                    <AppleIcon />
                    Continue with Apple
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-black/10" />
                  <span className="text-xs text-cubby-taupe font-semibold">or use email</span>
                  <div className="flex-1 h-px bg-black/10" />
                </div>

                {/* Magic link email */}
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={loading || !email.includes("@")}
                    className="w-full flex items-center justify-center gap-2 bg-cubby-cream border border-black/10 text-cubby-charcoal font-black rounded-2xl py-3.5 disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    {loading ? "Sending…" : "Send magic link"}
                  </button>
                </div>

                <p className="text-center text-xs text-cubby-taupe">
                  By continuing you agree to our Terms & Privacy Policy.
                </p>
              </div>
            )}

            {/* ── Step 2: Name ──────────────────────────────────────── */}
            {step === 2 && (
              <div className="flex-1 flex flex-col justify-center space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-6xl mb-4">👋</div>
                  <h1 className="text-page-title text-cubby-charcoal">Hello, Chef!</h1>
                  <p className="text-cubby-taupe">What should we call you?</p>
                </div>
                <Input
                  label="Your name"
                  placeholder="e.g. Sam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* ── Step 3: Notifications ─────────────────────────────── */}
            {step === 3 && (
              <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="text-center space-y-2">
                  <div className="text-6xl mb-4">🔔</div>
                  <h1 className="text-page-title text-cubby-charcoal">Stay on top of things</h1>
                  <p className="text-cubby-taupe">How often do you want expiry reminders?</p>
                </div>
                <div className="space-y-4">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={notifFreq}
                    onChange={(e) => setNotifFreq(Number(e.target.value))}
                    className="w-full accent-cubby-green"
                  />
                  <div className="flex justify-between text-xs text-cubby-taupe px-1">
                    {NOTIFICATION_LABELS.map((l) => <span key={l}>{l}</span>)}
                  </div>
                  <p className="text-center font-black text-cubby-charcoal text-lg">
                    {NOTIFICATION_LABELS[notifFreq]}
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 4: Dietary + Allergens ───────────────────────── */}
            {step === 4 && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="text-center space-y-1">
                  <div className="text-6xl mb-2">🥦</div>
                  <h1 className="text-page-title text-cubby-charcoal">Dietary needs</h1>
                  <p className="text-cubby-taupe text-sm">We&apos;ll tailor recipes to you.</p>
                </div>
                <Input
                  placeholder="Search diet or allergen…"
                  value={dietarySearch}
                  onChange={(e) => setDietarySearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 overflow-y-auto flex-1 pb-2">
                  {filteredDietary.map((d) => {
                    const allArr = DIETARY_OPTIONS.includes(d) ? selectedDietary : selectedAllergens;
                    const setArr = DIETARY_OPTIONS.includes(d) ? setSelectedDietary : setSelectedAllergens;
                    const selected = allArr.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleItem(allArr, setArr, d)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                          selected ? "bg-cubby-green text-white" : "bg-cubby-cream text-cubby-charcoal border border-black/10"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 5: Motivation ────────────────────────────────── */}
            {step === 5 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-6xl mb-2">🎯</div>
                  <h1 className="text-page-title text-cubby-charcoal">What matters to you?</h1>
                  <p className="text-cubby-taupe text-sm">Pick all that apply.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MOTIVATIONS.map((m) => {
                    const Icon = m.icon;
                    const selected = motivations.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleItem(motivations, setMotivations, m.id)}
                        className={cn(
                          "cubby-card p-4 flex flex-col items-center gap-2 transition-all",
                          selected && "bg-cubby-green border-cubby-green"
                        )}
                      >
                        <Icon className={cn("w-6 h-6", selected ? "text-white" : "text-cubby-charcoal")} />
                        <span className={cn("text-sm font-black", selected ? "text-white" : "text-cubby-charcoal")}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 6: Welcome ───────────────────────────────────── */}
            {step === 6 && (
              <div className="flex-1 flex flex-col justify-center items-center space-y-6 text-center">
                <div className="text-7xl animate-spring-pop">🎉</div>
                <div className="space-y-2">
                  <h1 className="text-page-title text-cubby-charcoal">You&apos;re all set, {name || "Chef"}!</h1>
                  <p className="text-cubby-taupe">Time to add your first item and start saving food.</p>
                </div>
                <div className="w-full space-y-3">
                  <Button onClick={() => window.location.href = "/log"} className="w-full">
                    Log my first item 🥦
                  </Button>
                  <Button variant="ghost" onClick={() => window.location.href = "/"} className="w-full">
                    Go to my kitchen
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons (skip step 1 — has its own CTA, skip step 6 — has own CTAs) */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="px-6 pb-8 flex items-center justify-between gap-4">
          <button onClick={goBack} className="text-sm font-semibold text-cubby-taupe">
            ← Back
          </button>
          <Button
            onClick={step === TOTAL_STEPS - 1 ? handleFinish : goNext}
            loading={loading}
            className="flex-1"
          >
            {step === TOTAL_STEPS - 1 ? "Finish" : "Next →"}
          </Button>
        </div>
      )}
    </div>
  );
}
