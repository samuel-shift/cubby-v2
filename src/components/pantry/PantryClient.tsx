"use client";

/**
 * PantryClient — List/Grid toggle pantry view
 *
 * - List view: information-dense (default when >15 items)
 * - Grid view: 2-column, category emoji (V1), flip-card interaction
 * - Location badge per item
 * - Filter by location / urgency
 * - Search
 * - Tap any item → bottom sheet detail/edit view
 */

import { useState, useCallback } from "react";
import { LayoutList, LayoutGrid, Search, X, ChevronDown, Trash2, Check, Pencil } from "lucide-react";
import { cn, getCategoryEmoji, formatExpiryLabel } from "@/lib/utils";
import { ExpiryPill } from "@/components/ui/ExpiryPill";
import { PageHeader } from "@/components/ui/PageHeader";

interface InventoryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  categoryEmoji: string | null;
  location: string;
  expiryDate: string | null;
  purchaseDate?: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  [key: string]: unknown;
}

const LOCATION_LABELS: Record<string, string> = {
  FRIDGE: "Fridge",
  FREEZER: "Freezer",
  COUNTER: "Counter",
  CUPBOARD: "Cupboard",
  PANTRY: "Pantry",
};

const LOCATIONS = ["FRIDGE", "FREEZER", "COUNTER", "CUPBOARD", "PANTRY"] as const;

// ─── Item Detail Sheet ────────────────────────────────────────────────────────

function ItemDetailSheet({
  item,
  onClose,
  onUpdate,
  onRemove,
}: {
  item: InventoryItem;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<InventoryItem>) => void;
  onRemove: (id: string) => void;
}) {
  const emoji = item.categoryEmoji ?? getCategoryEmoji(item.category);
  const [saving, setSaving] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [editingQty, setEditingQty] = useState(false);

  const [location, setLocation] = useState(item.location);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [expiryDate, setExpiryDate] = useState(
    item.expiryDate ? item.expiryDate.split("T")[0] : ""
  );

  async function patch
    
