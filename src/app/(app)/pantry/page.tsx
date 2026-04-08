/**
 * Pantry Screen
 *
 * HIGH priority per gap analysis.
 *
 * Features:
 * - List/grid toggle (list default when >15 items)
 * - List view: information-dense, expiry bars, quick actions (current v1 style)
 * - Grid view: 2-column, category emoji (NOT product photos — V2), flip-card interaction
 * - Location badge: MapPin + Fridge/Counter/Cupboard
 * - Filter by location / expiry urgency
 * - Search
 */
import { auth } from "@/auth";
import { PantryClient } from "@/components/pantry/PantryClient";
import { prisma } from "@/lib/prisma";

export default async function PantryPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Fetch active items, ordered by expiry date ascending
  const items = await prisma.inventoryItem.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  // Serialize Prisma Date objects to ISO strings for client component
  const serializedItems = items.map((item) => ({
    ...item,
    expiryDate: item.expiryDate ? item.expiryDate.toISOString() : null,
    purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    statusUpdatedAt: item.statusUpdatedAt ? item.statusUpdatedAt.toISOString() : null,
  }));

  return <PantryClient initialItems={serializedItems} />;
}
