import { PageHeader } from "@/components/ui/PageHeader";
import { UserCircle } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Profile" backHref="/" />
      <div className="flex flex-col items-center justify-center px-6 pt-24 text-center space-y-4">
        <div className="w-20 h-20 bg-cubby-cream rounded-full flex items-center justify-center">
          <UserCircle className="w-9 h-9 text-cubby-green" />
        </div>
        <h2 className="font-black text-cubby-charcoal text-2xl">Coming soon</h2>
        <p className="text-cubby-taupe text-sm max-w-xs">
          Dietary preferences, allergens, notifications, and account settings are coming in the next update.
        </p>
      </div>
    </div>
  );
}
