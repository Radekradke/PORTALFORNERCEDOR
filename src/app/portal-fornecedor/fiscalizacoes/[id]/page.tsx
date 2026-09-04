import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { getInspectionDetail } from "@/modules/inspections/services/inspection-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InspectionResponseBadge } from "@/components/layout/status-badges";
import { formatDateTime } from "@/lib/time";

export default async function PortalInspectionDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const inspection = await getInspectionDetail(actor, params.id);
  if (!inspection) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{inspection.template?.title ?? "Checklist"}</h1>
        <p className="text-muted-foreground">{formatDateTime(inspection.scheduledAt)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-2xl font-semibold">
            {inspection.conformityPercentage !== null ? `${Math.round(inspection.conformityPercentage)}%` : "—"}{" "}
            <span className="text-sm font-normal text-muted-foreground">de conformidade</span>
          </p>
        </CardContent>
      </Card>

      {inspection.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {section.items.map((item) => {
              const answer = inspection.answersByItem.get(item.id);
              return (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{item.text}</p>
                    <InspectionResponseBadge response={answer?.response ?? null} />
                  </div>
                  {answer?.observation && <p className="mt-1 text-xs text-muted-foreground">{answer.observation}</p>}
                  {answer && answer.evidences.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1 text-xs">
                      {answer.evidences.map((e) => (
                        <a
                          key={e.id}
                          href={`/api/evidencias/${e.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-4"
                        >
                          {e.fileObject.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
