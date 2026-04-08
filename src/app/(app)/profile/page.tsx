/**
 * Profile / Settings Page
 * Accessible via header avatar — not a bottom nav tab.
 * Unaffected by redesign — apply new design tokens only.
 */
import { PageHeader } from "@/components/ui/PageHeader";
import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Profile" backHref="/" />
      <div className="px-4 pt-4">
        <div className="cubby-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-cubby-green flex items-center justify-center">
              <span className="text-white text-2xl font-black">
                {session?.user?.name?.[0]?.toUpperCase() ?? "C"}
              </span>
            </div>
            <div>
              <p className="font-black text-cubby-charcoal text-lg">
                {session?.user?.name ?? "Chef"}
              </p>
              <p className="text-cubby-taupe text-sm">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* TODO: Settings sections — dietary preferences, notifications, account */}
      </div>
    </div>
  );
}
