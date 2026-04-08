/**
 * Swipe Status Screen
 *
 * MEDIUM priority per gap analysis. Already functional, needs visual upgrade.
 *
 * Upgrades from new design:
 * - 3 swipe directions: Left (binned), Right (eaten), Up (still here) — new!
 * - Visual stamps: EATEN / BINNED / STILL HERE overlaid during drag
 * - Progress bar: green fill as items processed
 * - Undo button: undo last action
 * - 3-card stack with scale/offset + spring physics
 * - Completion: confetti + "You're all caught up!"
 */
import { SwipeStatusClient } from "@/components/swipe/SwipeStatusClient";

export default function SwipePage() {
  return <SwipeStatusClient />;
}
