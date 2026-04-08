/**
 * App Layout
 * Wraps all main app screens with the bottom navigation.
 * Auth-free: no redirect, everyone lands on the app directly.
 */
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-wrapper">
      <main className="pb-safe">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
