import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CondemnationApprovalRow, MovementApprovalRow } from "@/lib/bems";

const VISIBLE_ROWS = 3;

export function ApprovalMovementCard({
  movementApprovals,
  condemnationApprovals,
}: {
  movementApprovals: MovementApprovalRow[];
  condemnationApprovals: CondemnationApprovalRow[];
}) {
  const totalPending = movementApprovals.length + condemnationApprovals.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Approval movement</CardTitle>
          <CardDescription>{totalPending} pending across movement and condemnation</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/approvals">View all approvals</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-3 text-sm font-medium">Movement approvals</p>
          {movementApprovals.length > 0 ? (
            <div className="space-y-3">
              {movementApprovals.slice(0, VISIBLE_ROWS).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{m.equipmentDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.fromRoomName} → {m.toRoomName}
                    </p>
                  </div>
                  <Badge variant={m.flaggedUnapproved ? "destructive" : "outline"}>
                    {m.flaggedUnapproved ? "Unapproved" : "Pending"}
                  </Badge>
                </div>
              ))}
              {movementApprovals.length > VISIBLE_ROWS && (
                <p className="text-xs text-muted-foreground">
                  +{movementApprovals.length - VISIBLE_ROWS} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No movement approvals pending.</p>
          )}
        </div>

        <Separator />

        <div>
          <p className="mb-3 text-sm font-medium">Condemnation approvals</p>
          {condemnationApprovals.length > 0 ? (
            <div className="space-y-3">
              {condemnationApprovals.slice(0, VISIBLE_ROWS).map((c) => (
                <Link key={c.id} href={c.href} className="block text-sm hover:underline">
                  <p className="truncate">{c.equipmentDisplayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.justification}</p>
                </Link>
              ))}
              {condemnationApprovals.length > VISIBLE_ROWS && (
                <p className="text-xs text-muted-foreground">
                  +{condemnationApprovals.length - VISIBLE_ROWS} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No condemnation requests awaiting approval.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
