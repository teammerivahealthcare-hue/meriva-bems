"use client";

import Link from "next/link";
import { UsersThree, Plus, DotsThreeVertical } from "@phosphor-icons/react";
import {
  useDemo,
  TEAM_ROLE_LABEL,
  AVAILABILITY_LABEL,
  AVAILABILITY_DOT_CLASS,
  availabilityFor,
  activeJobsCountFor,
  type TeamMember,
} from "@/lib/bems";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const teamMembers = useDemo((s) => s.teamMembers);
  const deactivateTeamMember = useDemo((s) => s.deactivateTeamMember);
  const activateTeamMember = useDemo((s) => s.activateTeamMember);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground text-sm">
            {teamMembers.length} team member{teamMembers.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/team/add">
            <Plus /> Add team member
          </Link>
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <UsersThree size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No team members yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add internal engineers and staff to give them login credentials and track their jobs and usage sessions.
          </p>
          <Button asChild className="mt-2">
            <Link href="/team/add">
              <Plus /> Add team member
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Active jobs</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member: TeamMember) => {
                const isEngineer = member.role === "ENGINEER";
                const availability = isEngineer ? availabilityFor(member.id) : null;
                return (
                  <TableRow key={member.id} className={member.active ? undefined : "opacity-50"}>
                    <TableCell>
                      <Link href={`/team/${member.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(member.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                        {!member.active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TEAM_ROLE_LABEL[member.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.phone}</TableCell>
                    <TableCell>
                      {availability ? (
                        <span className="flex items-center gap-2">
                          <span className={`size-2 shrink-0 rounded-full ${AVAILABILITY_DOT_CLASS[availability]}`} />
                          {AVAILABILITY_LABEL[availability]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEngineer ? (
                        <span className="tabular-nums">{activeJobsCountFor(member.id)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <DotsThreeVertical />
                            <span className="sr-only">Row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/team/${member.id}`}>Edit</Link>
                          </DropdownMenuItem>
                          {member.active ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => deactivateTeamMember(member.id)}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => activateTeamMember(member.id)}>
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
