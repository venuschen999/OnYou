import { Suspense, type ReactNode } from "react";
import { ActiveSessionNotice } from "@/components/ActiveSessionNotice";
import { AppHeader } from "@/components/AppHeader";
import { PageLoading } from "@/components/PageLoading";
import { RequireUser } from "@/components/RequireUser";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <ActiveSessionNotice />
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-9">
        {/* cacheComponents: the session read must stream behind Suspense. */}
        <Suspense fallback={<PageLoading />}>
          <RequireUser>{children}</RequireUser>
        </Suspense>
      </main>
    </>
  );
}
