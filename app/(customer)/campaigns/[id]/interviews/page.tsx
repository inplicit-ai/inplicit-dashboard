import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { makeApi, type Interview } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

export default async function InterviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let interviews: Interview[] = [];
  let error: unknown = null;
  try {
    interviews = await api.interviews.list(id);
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader
        title="Interviews"
        meta={`${interviews.length} ${interviews.length === 1 ? "Gespräch" : "Gespräche"} in diesem Audit.`}
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {interviews.length === 0 ? (
        <Card className="rounded-card border-dashed bg-surface/40 p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch keine Interviews durchgeführt.
              </p>
              <p className="text-sm text-fg-muted">
                Lade Teilnehmer ein, um zu starten.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-surface/40 hover:bg-surface/40">
                <TableHead>Anonyme ID</TableHead>
                <TableHead>Abteilung</TableHead>
                <TableHead>Modus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auswertung</TableHead>
                <TableHead>Gestartet</TableHead>
                <TableHead className="w-12 text-right" aria-label="" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((i) => {
                const href = `/campaigns/${id}/interviews/${i.id}`;
                return (
                  <TableRow key={i.id} className="group">
                    <TableCell>
                      <Link
                        href={href}
                        className="font-mono text-xs font-medium text-fg hover:text-accent"
                      >
                        {i.anon_id}
                      </Link>
                    </TableCell>
                    <TableCell>{i.department ?? "—"}</TableCell>
                    <TableCell className="capitalize text-fg-muted">
                      {i.mode}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell>
                      {i.processing_status && i.status === "COMPLETED" ? (
                        <StatusBadge status={i.processing_status} />
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {i.started_at
                        ? new Date(i.started_at).toLocaleString("de-DE")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={href}
                        aria-label={`Interview ${i.anon_id} öffnen`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle transition-colors group-hover:text-fg hover:bg-surface-2"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
