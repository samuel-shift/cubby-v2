import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { KitchenSetupClient } from "@/components/kitchen-setup/KitchenSetupClient";

export default async function KitchenSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/onboarding");
  return <KitchenSetupClient />;
}
