/**
 * Splash Screen — LOW priority, nice to have
 *
 * Dancing food characters (TomatoBean, CarrotBean, AvocadoBean, EggBean, BreadBean)
 * Auto-redirects after 3.5s to /onboarding or / depending on auth state.
 */
import { SplashClient } from "@/components/splash/SplashClient";

export default function SplashPage() {
  return <SplashClient />;
}
