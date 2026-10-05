import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "250px" } as CSSProperties}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-surface px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <div data-scroll-root className="flex-1 overflow-y-auto p-8" style={{ scrollbarGutter: "stable" }}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
