/**
 * Manual Entry — "Type it in"
 * Route: /log/type
 *
 * Quickest path to getting items into the pantry.
 * No camera, no AI — just a form.
 * Maps to entryMethod: MANUAL in the DB.
 */
import { ManualEntryClient } from "@/components/log/ManualEntryClient";

export default function ManualEntryPage() {
  return <ManualEntryClient />;
}
