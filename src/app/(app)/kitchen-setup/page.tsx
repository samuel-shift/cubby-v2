import { KitchenSetupClient } from "@/components/kitchen-setup/KitchenSetupClient";
import { getSession } from "@/lib/session";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function KitchenSetupPage() {
  const nextAuth = await auth().catch(() => null);
  const custom = await getSession();
  if (!nextAuth?.user?.id && !custom?.userId) redirect("/onboarding");

  return <KitchenSetupClient />;
}
