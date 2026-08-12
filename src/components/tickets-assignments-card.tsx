import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ActiveTicketRow } from "@/components/active-ticket-row";
import type { ActiveTicket, TicketAssignmentRow } from "@/lib/bems";

const VISIBLE_ROWS = 3;

export function TicketsAssignmentsCard({
  tickets,
  assignments,
}: {
  tickets: ActiveTicket[];
  assignments: TicketAssignmentRow[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Tickets &amp; assignments</CardTitle>
          <CardDescription>Open repair tickets and work in progress</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/tickets">View all tickets</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium">Most urgent tickets</p>
          {tickets.length > 0 ? (
            <div>
              {tickets.slice(0, VISIBLE_ROWS).map((ticket) => (
                <ActiveTicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active tickets right now.</p>
          )}
          {tickets.length > VISIBLE_ROWS && (
            <p className="pt-2 text-xs text-muted-foreground">+{tickets.length - VISIBLE_ROWS} more</p>
          )}
        </div>

        <Separator />

        <div>
          <p className="mb-3 text-sm font-medium">Ticket assignments</p>
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, VISIBLE_ROWS).map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{w.equipmentDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{w.engineerName ?? "Unassigned"}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={w.scheduled ? "" : "bg-amber-50 text-amber-800 border-amber-200"}
                  >
                    {w.scheduled ? "Scheduled" : "In progress"}
                  </Badge>
                </div>
              ))}
              {assignments.length > VISIBLE_ROWS && (
                <p className="text-xs text-muted-foreground">+{assignments.length - VISIBLE_ROWS} more</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tickets assigned right now.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
