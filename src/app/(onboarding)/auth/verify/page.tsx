/**
 * Magic Link Sent — Verify Email Page
 * Shown after user enters email on step 1 of onboarding.
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-4">
        {/* Food face illustration placeholder */}
        <div className="text-6xl">📬</div>
        <h1 className="text-page-title text-cubby-charcoal">Check your email</h1>
        <p className="text-cubby-taupe text-base max-w-xs">
          We&apos;ve sent a magic link to your inbox. Tap it to sign in — no password needed.
        </p>
        <p className="text-cubby-taupe text-sm">
          Didn&apos;t get it? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
