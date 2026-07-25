import Link from "next/link";
import {
  equipment,
  equipmentName,
  categoryName,
  getDepartment,
  getRoom,
  computeFlags,
  FLAG_LABEL,
} from "@/lib/bems";

export default function EquipmentPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Equipment</h1>
        <p className="text-muted-foreground text-sm">
          {equipment.length} equipment records across all departments
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map((eq) => {
          const flags = computeFlags(eq);
          const dept = getDepartment(eq.departmentId);
          const room = getRoom(eq.roomId);
          return (
            <Link
              key={eq.id}
              href={`/equipment/${eq.id}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{equipmentName(eq)}</p>
                  <p className="text-sm text-muted-foreground">{categoryName(eq)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">
                  {eq.operationalStatus.replace("_", " ")}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                <p>{eq.assetId}</p>
                <p>{dept?.name} · {room?.name}</p>
              </div>
              {flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {flags.map((f) => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {FLAG_LABEL[f]}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
