"use client";

/**
 * Manual Entry Client
 * Used by /log/type
 *
 * Form fields match the POST /api/inventory schema exactly:
 * name, brand, quantity, unit, category, location, expiryDate, entryMethod: MANUAL
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Typeahead } from "@/components/ui/Typeahead";
import { GROCERY_SUGGESTIONS, detectStorageLocation, detectCategory } from "@/lib/grocery-data";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_OPTIONS = [
  { id: "FRIDGE",  label: "Fridge",  emoji: "🧊" },
  { id: "FREEZER", label: "Freezer", emoji: "❄️" },
  { id: "PANTRY",  label: "Pantry",  emoji: "🏪" },
  { id: "COUNTER", label: "Counter", emoji: "🍌" },
  { id: "CUPBOARD",label: "Cupboard",emoji: "📦" },
] as const;

type StorageLocation = (typeof STORAGE_OPTIONS)[number]["id"];

const CATEGORIES = [
  { label: "Fresh Produce",       emoji: "🥦" },
  { label: "Meat & Fish",         emoji: "🥩" },
  { label: "Dairy & Eggs",        emoji: "🥛" },
  { label: "Bakery",              emoji: "🍞" },
  { label: "Frozen",              emoji: "🧊" },
  { label: "Tins & Cans",        emoji: "🥫" },
  { label: "Pasta, Rice & Grains",emoji: "🍝" },
  { label: "Condiments & Sauces", emoji: "🧴" },
  { label: "Drinks",              emoji: "🥤" },
  { label: "Snacks",              emoji: "🍪" },
  { label: "Other",               emoji: "📋" },
] as const;

type ExpiryType = "USE_BY" | "BEST_BEFORE";

interface FormState {
  name: string;
  brand: string;
  category: string;
  quantity: number;
  unit: string;
  location: StorageLocation;
  expiryDate: string;
  expiryType: ExpiryType;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualEntryClient() {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    brand: "",
    category: "",
    quantity: 1,
    unit: "",
    location: "FRIDGE",
    expiryDate: "",
    expiryType: "USE_BY",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastAdded, setLastAdded] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSelectSuggestion(val: string) {
    const location = detectStorageLocation(val);
    const category = detectCategory(val);
    setForm((f) => ({
      ...f,
      name: val,
      location,
      category: category !== "Other" ? category : f.category,
    }));
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Product name is required";
    if (!form.category) next.category = "Please pick a category";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        quantity: form.quantity,
        unit: form.unit.trim() || undefined,
        category: form.category,
        location: form.location,
        entryMethod: "MANUAL",
        expiryDate: form.expiryDate
          ? new Date(form.expiryDate).toISOString()
          : undefined,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to add item");

      setLastAdded(form.name.trim());
      setSuccess(true);
    } catch {
      setErrors({ name: "Something went wrong — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddAnother() {
    setForm({
      name: "",
      brand: "",
      category: "",
      quantity: 1,
      unit: "",
      location: "FRIDGE",
      expiryDate: "",
      expiryType: "USE_BY",
    });
    setErrors({});
    setSuccess(false);
  }

  // ─── Success state ───────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-cubby-stone flex flex-col items-center justify-center px-6">
        <div className="bg-cubby-cream rounded-card p-8 w-full max-w-sm text-center space-y-5 animate-spring-pop">
          <div className="w-16 h-16 bg-cubby-lime rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-cubby-green" strokeWidth={3} />
          </div>
          <div>
            <p className="font-black text-cubby-charcoal text-lg">{lastAdded} added!</p>
            <p className="text-cubby-taupe text-sm mt-1">It&apos;s in your Cubby 🧡</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={handleAddAnother}
              className="w-full bg-cubby-green text-white py-3.5 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
            >
              Add another item
            </button>
            <Link
              href="/pantry"
              className="block w-full bg-cubby-lime text-cubby-green py-3.5 rounded-2xl font-black text-sm text-center active:scale-[0.97] transition-transform"
            >
              View my kitchen
            </Link>
            <Link
              href="/"
              className="block text-cubby-taupe text-sm text-center pt-1"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Type it in" backHref="/log" />

      <form onSubmit={handleSubmit} className="px-4 pb-10 space-y-4">

        {/* Product name */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-2">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Product name <span className="text-cubby-urgent">*</span>
          </label>
          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Greek yoghurt"
              autoFocus
              autoComplete="off"
              className={cn(
                "w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold placeholder:text-cubby-taupe/60",
                "focus:outline-none focus:ring-2 focus:ring-cubby-green text-base",
                errors.name && "ring-2 ring-cubby-urgent"
              )}
            />
            <Typeahead
              value={form.name}
              suggestions={GROCERY_SUGGESTIONS}
              onSelect={handleSelectSuggestion}
              maxResults={5}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-cubby-urgent font-semibold">{errors.name}</p>
          )}
        </div>

        {/* Brand (optional) */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-2">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Brand <span className="text-cubby-taupe/50 normal-case font-semibold">(optional)</span>
          </label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="e.g. Fage, Oatly, Heinz"
            className="w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold placeholder:text-cubby-taupe/60 focus:outline-none focus:ring-2 focus:ring-cubby-green text-base"
          />
        </div>

        {/* Category */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-3">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Category <span className="text-cubby-urgent">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => set("category", cat.label)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all text-center",
                  form.category === cat.label
                    ? "bg-cubby-green border-cubby-green text-white"
                    : "bg-cubby-stone border-transparent text-cubby-charcoal active:scale-95"
                )}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-black leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.category && (
            <p className="text-xs text-cubby-urgent font-semibold">{errors.category}</p>
          )}
        </div>

        {/* Storage location */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-3">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Where does it live?
          </label>
          <div className="flex gap-2 flex-wrap">
            {STORAGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => set("location", opt.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 transition-all font-black text-sm",
                  form.location === opt.id
                    ? "bg-cubby-green border-cubby-green text-white"
                    : "bg-cubby-stone border-transparent text-cubby-charcoal active:scale-95"
                )}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + unit */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-3">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Quantity
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
              className="w-11 h-11 rounded-2xl bg-cubby-stone flex items-center justify-center active:scale-90 transition-transform"
            >
              <Minus className="w-4 h-4 text-cubby-charcoal" strokeWidth={3} />
            </button>
            <span className="text-3xl font-black text-cubby-charcoal w-10 text-center">
              {form.quantity}
            </span>
            <button
              type="button"
              onClick={() => set("quantity", form.quantity + 1)}
              className="w-11 h-11 rounded-2xl bg-cubby-green flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={3} />
            </button>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="unit (g, ml, pack…)"
              className="flex-1 bg-cubby-stone rounded-xl px-3 py-2.5 text-cubby-charcoal font-semibold placeholder:text-cubby-taupe/60 focus:outline-none focus:ring-2 focus:ring-cubby-green text-sm"
            />
          </div>
        </div>

        {/* Expiry date */}
        <div className="bg-cubby-cream rounded-card p-4 space-y-3">
          <label className="text-xs font-black text-cubby-taupe uppercase tracking-wider">
            Expiry date <span className="text-cubby-taupe/50 normal-case font-semibold">(optional)</span>
          </label>
         <input
  type="date"
  value={form.expiryDate}
  onChange={(e) => set("expiryDate", e.target.value)}
  style={{ WebkitAppearance: "none", appearance: "none" }}
  className="w-full bg-cubby-stone rounded-xl px-4 py-3 text-cubby-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-cubby-green text-base"
/>

          {form.expiryDate && (
            <div className="flex gap-2 pt-1">
              {(["USE_BY", "BEST_BEFORE"] as ExpiryType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("expiryType", type)}
                  className={cn(
                    "flex-1 py-2.5 rounded-2xl font-black text-sm transition-all border-2",
                    form.expiryType === type
                      ? "bg-cubby-green border-cubby-green text-white"
                      : "bg-cubby-stone border-transparent text-cubby-charcoal active:scale-95"
                  )}
                >
                  {type === "USE_BY" ? "Use By" : "Best Before"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full bg-cubby-green text-white py-4 rounded-2xl font-black text-base",
            "active:scale-[0.97] transition-all",
            submitting && "opacity-60"
          )}
        >
          {submitting ? "Adding…" : "Add to Cubby"}
        </button>

      </form>
    </div>
  );
}
