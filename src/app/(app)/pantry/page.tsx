/**
 * /pantry → redirects to /recipes?tab=pantry
 *
 * The pantry is now a tab within the Recipes hub.
 * This redirect ensures old links and bookmarks still work.
 */
import { redirect } from "next/navigation";

export default function PantryPage() {
  redirect("/recipes?tab=pantry");
}
