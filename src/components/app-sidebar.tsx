"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Stethoscope,
  UsersThree,
  Wrench,
  ClockClockwise,
  CalendarBlank,
  Gear,
  SignOut,
} from "@phosphor-icons/react";
import { useDemo } from "@/lib/bems";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: SquaresFour },
  { href: "/equipment", label: "Equipment", icon: Stethoscope },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/schedule", label: "Schedule", icon: CalendarBlank },
  { href: "/activity", label: "Activity", icon: ClockClockwise },
  { href: "/team", label: "Team", icon: UsersThree },
  { href: "/settings", label: "Settings", icon: Gear },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const account = useDemo((s) => s.account);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2.5">
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 items-center group-data-[collapsible=icon]:hidden">
            <Image
              src="/meriva-logo.png"
              alt="Meriva Healthcare"
              width={160}
              height={44}
              style={{ width: 160, height: 44 }}
              priority
            />
          </div>
          <SidebarTrigger size="icon" className="shrink-0 [&_svg]:size-5" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2.5">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="h-11 gap-2 p-2 text-sm [&_svg]:size-5 data-active:bg-[#DBF3FD] group-data-[collapsible=icon]:size-9!"
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2.5">
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <Avatar size="sm">
            <AvatarFallback>{account ? initials(account.name) : "?"}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{account?.name ?? "Unknown"}</span>
            <span className="truncate text-xs text-muted-foreground">{account?.email ?? ""}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 group-data-[collapsible=icon]:hidden"
            disabled
            aria-label="Sign out"
            title="Sign out"
          >
            <SignOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
