// Mobile-width container for every guest-facing screen. The admin console
// deliberately doesn't use this — it runs on a laptop and wants full width.
export function GuestShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">{children}</div>
}
