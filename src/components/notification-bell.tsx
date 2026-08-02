"use client";

import { Bell } from "@phosphor-icons/react";
import { useDemo, useUnreadCount, formatDate } from "@/lib/bems";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const notifications = useDemo((s) => s.notifications);
  const markRead = useDemo((s) => s.markNotificationRead);
  const unread = useUnreadCount();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.slice(0, 6).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex-col items-start gap-0.5 whitespace-normal"
              onSelect={() => markRead(n.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
              <span className="text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[11px] text-muted-foreground">{formatDate(n.createdAt)}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-1.5 py-2 text-sm text-muted-foreground">No notifications.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
