import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { NavigationTracker } from "@/components/NavigationTracker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSessionUser())) redirect("/login");

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
      <NavigationTracker />
      {children}
      <BottomNav />
    </div>
  );
}
