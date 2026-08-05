import { Badge } from "@/components/ui/badge";
import { formatDate, PRIORITY_BADGE, type ActiveTicket } from "@/lib/bems";

function ActiveTicketRowContent({ ticket }: { ticket: ActiveTicket }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge variant="outline" className={`shrink-0 ${PRIORITY_BADGE[ticket.priority]}`}>
          {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
        </Badge>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ticket.equipmentDisplayName}</p>
          <p className="text-xs text-muted-foreground">
            {ticket.department} · Updated {formatDate(ticket.lastUpdated)}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm">{ticket.statusLabel}</p>
        <p className="text-xs text-muted-foreground">{ticket.engineerName ?? "Unassigned"}</p>
      </div>
    </>
  );
}

/** Row for a ticket. Pass `onClick` to open the ticket detail sheet; omitted for read-only previews (e.g. the dashboard). */
export function ActiveTicketRow({ ticket, onClick }: { ticket: ActiveTicket; onClick?: (ticket: ActiveTicket) => void }) {
  if (!onClick) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-muted py-3 first:pt-0 last:border-0 last:pb-0">
        <ActiveTicketRowContent ticket={ticket} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(ticket)}
      className="flex w-full items-center justify-between gap-4 border-b border-muted py-3 text-left first:pt-0 last:border-0 last:pb-0 hover:bg-muted/40"
    >
      <ActiveTicketRowContent ticket={ticket} />
    </button>
  );
}
