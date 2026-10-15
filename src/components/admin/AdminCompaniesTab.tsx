import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Trash2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { useToast } from "@/hooks/use-toast";
import { deleteAdminCompany, getAdminCompanies, setAdminCompanyUnlimited, type AdminCompany } from "@/lib/api/admin";
import { ConfirmByTypingDialog } from "./ConfirmByTypingDialog";
import { errorMessage, formatDate } from "./adminFormat";

const STATUS_STYLE: Record<string, string> = {
  active: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  past_due: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  cancelled: "border-destructive/40 text-destructive",
  expired: "border-destructive/40 text-destructive",
  none: "text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Payment due",
  cancelled: "Cancelled",
  expired: "Expired",
  none: "No plan",
};

const PlanCell: React.FC<{ company: AdminCompany }> = ({ company }) => {
  const sub = company.subscription;
  const status = sub?.status ?? "none";
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{sub?.planName ?? "No plan"}</div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="outline" className={STATUS_STYLE[status] ?? ""}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
        {sub?.cancelAtPeriodEnd && <span className="text-xs text-muted-foreground">cancels {formatDate(sub.currentPeriodEnd)}</span>}
        {sub?.status === "active" && !sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <span className="text-xs text-muted-foreground">renews {formatDate(sub.currentPeriodEnd)}</span>
        )}
      </div>
    </div>
  );
};

export const AdminCompaniesTab: React.FC = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminCompany | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompanies((await getAdminCompanies()).companies);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.name, c.adminEmail, c.createdByEmail, ...c.admins].some((v) => v?.toLowerCase().includes(q))
    );
  }, [companies, search]);

  const toggleUnlimited = async (company: AdminCompany, isUnlimited: boolean) => {
    setBusyId(company.id);
    try {
      await setAdminCompanyUnlimited(company.id, isUnlimited);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id
            ? {
                ...c,
                subscription: c.subscription
                  ? { ...c.subscription, isUnlimited }
                  : {
                      plan: null,
                      planName: null,
                      status: "none",
                      currentPeriodEnd: null,
                      isUnlimited,
                      cancelAtPeriodEnd: false,
                      hasPaidSubscription: false,
                    },
              }
            : c
        )
      );
      toast({
        title: isUnlimited ? "Unlimited access on" : "Unlimited access off",
        description: isUnlimited
          ? `${company.name} now has full access without paying.`
          : `${company.name} is back to its normal plan.`,
      });
    } catch (err) {
      toast({ title: "Couldn't change unlimited access", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (typedName: string) => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteAdminCompany(deleting.id, typedName);
      setCompanies((prev) => prev.filter((c) => c.id !== deleting.id));
      toast({ title: "Company deleted", description: `${deleting.name} and all its data were deleted.` });
      setDeleting(null);
    } catch (err) {
      toast({ title: "Couldn't delete company", description: errorMessage(err), variant: "destructive" });
      load(); // part of it may have been deleted — show the real state
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading companies..." />;
  if (error) return <ErrorState title="Couldn't load companies" message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search company or admin email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {companies.length} compan{companies.length === 1 ? "y" : "ies"}
      </p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                    <TableHead className="text-right">Datasets</TableHead>
                    <TableHead className="text-right">Models</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Unlimited</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                        No companies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium">
                            {c.name}
                            {c.isGsn && (
                              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
                                <ShieldCheck className="h-3 w-3" />
                                GSN
                              </Badge>
                            )}
                          </div>
                          {c.description && <div className="max-w-56 truncate text-xs text-muted-foreground">{c.description}</div>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.admins.length > 0 ? c.admins.join(", ") : c.adminEmail || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.members}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.projects}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.datasets}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.models}</TableCell>
                        <TableCell>
                          <PlanCell company={c} />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={!!c.subscription?.isUnlimited}
                            disabled={busyId === c.id}
                            onCheckedChange={(checked) => toggleUnlimited(c, checked)}
                            aria-label={`Unlimited access for ${c.name}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(c.createdAt)}</TableCell>
                        <TableCell>
                          {c.isGsn ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button variant="ghost" size="icon" disabled aria-label="GSN company is protected">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>The GSN company can't be deleted</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={busyId === c.id}
                              onClick={() => setDeleting(c)}
                              aria-label={`Delete ${c.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <ConfirmByTypingDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "company"}?`}
        consequences={[
          "Cancel its paid plan in Razorpay, if it has one",
          `Remove all ${deleting?.members ?? 0} member(s) from the company (their logins stay)`,
          `Delete its ${deleting?.projects ?? 0} project(s), ${deleting?.datasets ?? 0} dataset(s) and ${deleting?.models ?? 0} model(s)`,
          "Delete all its training and inference results and files",
        ]}
        confirmText={deleting?.name ?? ""}
        confirmLabel="Delete company"
        busy={!!deleting && busyId === deleting.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
