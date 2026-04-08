/**
 * Onboarding Layout
 * Unauthenticated — no bottom nav, full screen.
 * Wraps all /onboarding/* routes.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-wrapper min-h-screen bg-cubby-stone">
      {children}
    </div>
  );
}
