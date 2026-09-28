"use client";

import { useState, type DragEvent } from "react";
import { MagicWand, Clock, DotsThree, Wrench, ArrowRight } from "@phosphor-icons/react";
import {
  useDemo,
  formatDate,
  canMoveTicket,
  ticketBoardColumn,
  ticketCompletedAt,
  PRIORITY_BADGE,
  TICKET_BOARD_COLUMNS,
  TICKET_COMPLETED_VISIBLE_MS,
  type ActiveTicket,
  type TicketBoardColumn,
} from "@/lib/bems";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLUMN_META: Record<TicketBoardColumn, { title: string; hint: string; dotClass: string; empty: string }> = {
  OPENED: {
    title: "Opened",
    hint: "Raised, waiting for an engineer",
    dotClass: "bg-orange-500",
    empty: "No tickets waiting for an engineer.",
  },
  ASSIGNED: {
    title: "Assigned",
    hint: "Engineer confirmed, not started yet",
    dotClass: "bg-blue-500",
    empty: "Drag an opened ticket here to assign it.",
  },
  IN_PROGRESS: {
    title: "In progress",
    hint: "Engineer is on it",
    dotClass: "bg-emerald-600",
    empty: "Nothing being worked on right now.",
  },
  COMPLETED: {
    title: "Completed",
    hint: "Moves to History an hour after completion",
    dotClass: "bg-zinc-400",
    empty: "Tickets finished in the last hour show here.",
  },
};

/** Waiting-on states that live in In progress but deserve a flag on the card. */
const BLOCKED_LABEL: Partial<Record<ActiveTicket["status"], string>> = {
  PENDING_PARTS: "Awaiting parts",
  PENDING_VENDOR: "Awaiting vendor",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function priorityLabel(priority: string): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function minutesUntilHistory(ticket: ActiveTicket, nowMs: number): number {
  const at = ticketCompletedAt(ticket);
  if (!at) return 0;
  const left = Math.ceil((new Date(at).getTime() + TICKET_COMPLETED_VISIBLE_MS - nowMs) / 60_000);
  return Math.min(TICKET_COMPLETED_VISIBLE_MS / 60_000, Math.max(1, left));
}

function TicketBoardCard({
  ticket,
  column,
  collapsed,
  nowMs,
  dragging,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  ticket: ActiveTicket;
  column: TicketBoardColumn;
  collapsed: boolean;
  nowMs: number;
  dragging: boolean;
  onOpen: () => void;
  onMove: (to: TicketBoardColumn) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const blocked = BLOCKED_LABEL[ticket.status];
  const targets = TICKET_BOARD_COLUMNS.filter((c) => canMoveTicket(column, c));

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ticket.id);
    onDragStart();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${ticket.equipmentDisplayName}, ${ticket.ticketNumber}. Open details`}
      className={cn(
        "group/ticket cursor-grab space-y-2 rounded-lg border bg-surface p-3.5 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold leading-snug">{ticket.equipmentDisplayName}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className={PRIORITY_BADGE[ticket.priority]}>
            {priorityLabel(ticket.priority)}
          </Badge>
          {targets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-mr-1 text-muted-foreground"
                  aria-label={`Move ${ticket.ticketNumber}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <DotsThree size={16} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                {targets.map((to) => (
                  <DropdownMenuItem key={to} onSelect={() => onMove(to)}>
                    <ArrowRight size={14} /> {COLUMN_META[to].title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{ticket.location}</p>
          <p className="text-xs text-muted-foreground">
            {ticket.ticketNumber} · {ticket.department} · updated {formatDate(ticket.lastUpdated)}
          </p>
        </div>
      )}

      {!collapsed && (blocked || (ticket.responseOverdue && column !== "COMPLETED")) && (
        <div className="flex flex-wrap gap-1.5">
          {blocked && (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-transparent">
              {blocked}
            </Badge>
          )}
          {ticket.responseOverdue && column !== "COMPLETED" && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-transparent">
              Response overdue
            </Badge>
          )}
        </div>
      )}

      {column === "IN_PROGRESS" && ticket.workStartedAt && !collapsed && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wrench size={12} /> Work started {formatDate(ticket.workStartedAt)}
        </p>
      )}
      {column === "COMPLETED" && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} /> Moves to History in {minutesUntilHistory(ticket, nowMs)} min
        </p>
      )}

      <div className="pt-0.5">
        {ticket.engineerName ? (
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Avatar size="sm">
              <AvatarFallback className="bg-teal-50 font-semibold text-teal-700">{initials(ticket.engineerName)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{ticket.engineerName}</span>
          </span>
        ) : column === "OPENED" ? (
          <span className="text-sm font-medium text-red-700">Unassigned</span>
        ) : (
          // Past Opened with no in-house engineer means the vendor is handling it.
          <span className="text-sm text-muted-foreground">No in-house engineer</span>
        )}
      </div>
    </div>
  );
}

/**
 * Kanban over the ticket lifecycle. Cards move by drag or by each card's
 * Move menu (keyboard/touch). Opened → Assigned needs an engineer, so that
 * drop opens the assign dialog via onAssign instead of moving straight away.
 */
export function TicketBoard({
  tickets,
  collapsed,
  nowMs,
  onOpen,
  onAssign,
}: {
  tickets: ActiveTicket[];
  collapsed: boolean;
  nowMs: number;
  onOpen: (ticketId: string) => void;
  onAssign: (ticketId: string) => void;
}) {
  const moveTicket = useDemo((s) => s.moveTicket);
  const autoAssignOpenTickets = useDemo((s) => s.autoAssignOpenTickets);
  const teamMembers = useDemo((s) => s.teamMembers);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TicketBoardColumn | null>(null);

  const hasEngineers = teamMembers.some((m) => m.role === "ENGINEER" && m.active);
  const dragTicket = tickets.find((t) => t.id === dragId);
  const dragFrom = dragTicket ? ticketBoardColumn(dragTicket.status) : null;

  function move(ticket: ActiveTicket, to: TicketBoardColumn) {
    const from = ticketBoardColumn(ticket.status);
    if (!canMoveTicket(from, to)) return;
    if (from === "OPENED") onAssign(ticket.id);
    else moveTicket(ticket.id, to);
  }

  function endDrag() {
    setDragId(null);
    setOverColumn(null);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TICKET_BOARD_COLUMNS.map((column) => {
        const meta = COLUMN_META[column];
        const items = tickets.filter((t) => ticketBoardColumn(t.status) === column);
        const droppable = dragFrom != null && canMoveTicket(dragFrom, column);
        const isOver = droppable && overColumn === column;

        return (
          <section
            key={column}
            aria-label={meta.title}
            onDragOver={(e) => {
              if (!droppable) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overColumn !== column) setOverColumn(column);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverColumn(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragTicket && droppable) move(dragTicket, column);
              endDrag();
            }}
            className={cn(
              "flex flex-col gap-3 rounded-xl bg-muted/70 p-3 ring-2 ring-transparent transition-[opacity,box-shadow]",
              dragFrom != null && !droppable && column !== dragFrom && "opacity-50",
              isOver && "ring-primary/50"
            )}
          >
            <header className="space-y-0.5 px-1">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", meta.dotClass)} />
                <h2 className="text-sm font-semibold">{meta.title}</h2>
                <span className="rounded-full border bg-surface px-2 text-xs tabular-nums text-muted-foreground">
                  {items.length}
                </span>
                {column === "OPENED" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="ml-auto text-muted-foreground"
                        aria-label="Auto-assign opened tickets"
                        disabled={items.length === 0 || !hasEngineers}
                        onClick={() => autoAssignOpenTickets()}
                      >
                        <MagicWand size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Auto-assign by engineer workload</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{meta.hint}</p>
            </header>

            {items.length > 0 ? (
              items.map((ticket) => (
                <TicketBoardCard
                  key={ticket.id}
                  ticket={ticket}
                  column={column}
                  collapsed={collapsed}
                  nowMs={nowMs}
                  dragging={dragId === ticket.id}
                  onOpen={() => onOpen(ticket.id)}
                  onMove={(to) => move(ticket, to)}
                  onDragStart={() => setDragId(ticket.id)}
                  onDragEnd={endDrag}
                />
              ))
            ) : (
              <p
                className={cn(
                  "rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground",
                  isOver && "border-primary/50"
                )}
              >
                {meta.empty}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
