/**
 * OIG LEIE Exclusion Checks Page
 * ──────────────────────────────
 * Monthly batch screening of all active staff against the federal
 * OIG LEIE (Office of Inspector General List of Excluded Individuals/Entities).
 *
 * Required by federal law for any Medicaid-billing agency.
 * Generates a dated audit log proving the check was run.
 *
 * No patient data or PHI — staff names only.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle,
  Play, Clock, Users, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp,
} from "lucide-react";

type OigResult = {
  staffId: number;
  staffName: string;
  status: "cleared" | "flagged" | "error";
  matchCount?: number;
  details?: string;
};

export default function OigExclusionChecks() {
  const [expandedCheckId, setExpandedCheckId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: checks, isLoading, refetch } = trpc.bacb.listOigChecks.useQuery({ limit: 12 });

  const runCheck = trpc.bacb.runOigCheck.useMutation({
    onMutate: () => setIsRunning(true),
    onSuccess: (data) => {
      setIsRunning(false);
      refetch();
      if (data.flagged > 0) {
        toast.error(`⚠️ ${data.flagged} staff member(s) flagged on OIG exclusion list!`);
      } else {
        toast.success(`All ${data.totalStaff} staff members cleared — no exclusions found.`);
      }
    },
    onError: (err) => {
      setIsRunning(false);
      toast.error(`OIG check failed: ${err.message}`);
    },
  });

  const latestCheck = checks?.[0];
  const hasEverRun = checks && checks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            OIG Exclusion Screening
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly federal exclusion list check — required for Medicaid-billing agencies
          </p>
        </div>
        <Button
          onClick={() => runCheck.mutate()}
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run OIG Check Now
            </>
          )}
        </Button>
      </div>

      {/* Status Summary Card */}
      {latestCheck && (
        <Card className={latestCheck.flagged > 0 ? "border-destructive" : "border-green-500/50"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {latestCheck.flagged > 0 ? (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              )}
              Last Check: {new Date(latestCheck.runAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardTitle>
            <CardDescription>
              {latestCheck.flagged > 0
                ? `⚠️ ${latestCheck.flagged} staff member(s) require immediate review`
                : "All staff cleared — no exclusions found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{latestCheck.totalStaff}</div>
                <div className="text-xs text-muted-foreground">Staff Checked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{latestCheck.cleared}</div>
                <div className="text-xs text-muted-foreground">Cleared</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{latestCheck.flagged}</div>
                <div className="text-xs text-muted-foreground">Flagged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{latestCheck.errors}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      {!hasEverRun && !isLoading && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  No OIG exclusion checks have been run yet
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Federal law requires Medicaid-billing agencies to screen all staff against the OIG
                  LEIE exclusion list monthly. Click "Run OIG Check Now" to perform your first screening.
                  Results are stored as a dated audit log for compliance documentation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running indicator */}
      {isRunning && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  Screening staff against OIG LEIE database...
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Downloading the federal exclusion list (~15MB) and checking each staff member.
                  This may take 30–60 seconds depending on staff count.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check History */}
      {hasEverRun && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Screening History (Audit Log)
          </h2>
          <p className="text-sm text-muted-foreground">
            Each entry below is a dated record proving your agency ran the OIG exclusion check.
            Keep these for auditors.
          </p>

          <div className="space-y-2">
            {checks?.map((check) => {
              const isExpanded = expandedCheckId === check.id;
              const results = (check.results as OigResult[]) || [];

              return (
                <Card key={check.id} className="overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                  >
                    <div className="flex items-center gap-3">
                      {check.flagged > 0 ? (
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium">
                        {new Date(check.runAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {check.totalStaff}
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          {check.cleared}
                        </Badge>
                        {check.flagged > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {check.flagged}
                          </Badge>
                        )}
                        {check.errors > 0 && (
                          <Badge variant="secondary" className="gap-1 text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {check.errors}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && results.length > 0 && (
                    <div className="border-t px-4 py-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 font-medium">Staff Member</th>
                              <th className="text-left py-2 font-medium">Status</th>
                              <th className="text-left py-2 font-medium">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((r, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2 font-medium">{r.staffName}</td>
                                <td className="py-2">
                                  {r.status === "cleared" && (
                                    <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-400">
                                      Cleared
                                    </Badge>
                                  )}
                                  {r.status === "flagged" && (
                                    <Badge variant="destructive">
                                      FLAGGED — {r.matchCount} match(es)
                                    </Badge>
                                  )}
                                  {r.status === "error" && (
                                    <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                                      Error
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2 text-muted-foreground">
                                  {r.details || "No exclusion matches found"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance Note */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">About OIG LEIE Screening</p>
              <p>
                The Office of Inspector General maintains the List of Excluded Individuals/Entities (LEIE).
                Federal regulations (42 CFR 1001) require Medicaid-billing providers to check all employees
                against this list monthly. Employing an excluded individual can result in civil monetary
                penalties and program exclusion.
              </p>
              <p>
                AuditReady downloads the official OIG exclusion database and checks each staff member by name.
                Results are stored as a dated audit log. A "flagged" result means a name match was found —
                manual verification at{" "}
                <a
                  href="https://exclusions.oig.hhs.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  exclusions.oig.hhs.gov
                </a>{" "}
                is always required to confirm identity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
