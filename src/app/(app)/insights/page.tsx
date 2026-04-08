import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-cubby-stone">
      <PageHeader title="Insights" />
      <div className="flex flex-col items-center justify-center px-6 pt-24 text-center space-y-4">
        <div className="w-20 h-20 bg-cubby-cream rounded-full flex items-center justify-center">
          <BarChart3 className="w-9 h-9 text-cubby-green" />
        </div>
        <h2 className="font-black text-cubby-charcoal text-2xl">Coming soon</h2>
        <p className="text-cubby-taupe text-sm max-w-xs">
          Your waste stats, money saved, and streaks are on their way. Keep logging to build up your data!
        </p>
      </div>
    </div>
  );
}
