"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Stethoscope,
  UsersThree,
  ListChecks,
  Wrench,
  ClockClockwise,
  CaretUpDown,
  SignOut,
} from "@phosphor-icons/react";
import { getUser } from "@/lib/bems";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: SquaresFour },
  { href: "/equipment", label: "Equipment", icon: Stethoscope },
  { href: "/approvals", label: "Approvals", icon: ListChecks },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/activity", label: "Activity", icon: ClockClockwise },
  { href: "/team", label: "Team", icon: UsersThree },
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
  const admin = getUser("usr-admin");

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
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2.5">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="h-11 gap-2 p-3 text-sm [&_svg]:size-5 data-active:bg-[#DBF3FD]"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar size="sm">
                <AvatarFallback>{admin ? initials(admin.name) : "?"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{admin?.name ?? "Unknown"}</span>
                <span className="truncate text-xs text-muted-foreground">{admin?.email ?? ""}</span>
              </div>
              <CaretUpDown className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem disabled>
              <SignOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
