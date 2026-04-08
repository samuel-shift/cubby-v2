/**
 * Authenticated App Layout
 * Wraps all main app screens with the bottom navigation.
 * Protected routes: redirect to /onboarding if no session.
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/onboarding");
  }

  return (
    <div className="page-wrapper">
      {/* Page content — padded to clear bottom nav */}
      <main className="pb-safe">
        {children}
      </main>

      {/* 5-tab bottom navigation */}
      <BottomNav />
    </div>
  );
}
