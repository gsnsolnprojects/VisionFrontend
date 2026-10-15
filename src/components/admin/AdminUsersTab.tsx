import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Search, ShieldCheck, UserX, UserCheck, Trash2, CheckCircle2, CircleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { RoleBadge } from "@/components/RoleBadge";
import { useToast } from "@/hooks/use-toast";
import { deleteAdminUser, getAdminUsers, setAdminUserStatus, type AdminUser } from "@/lib/api/admin";
import { ConfirmByTypingDialog } from "./ConfirmByTypingDialog";
import { errorMessage, formatDate, timeAgo } from "./adminFormat";

const NO_COMPANY = "__none__";

export const AdminUsersTab: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers((await getAdminUsers()).users);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companies = useMemo(
    () => [...new Set(users.map((u) => u.companyName).filter(Boolean) as string[])].sort(),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && ![u.name, u.email, u.companyName].some((v) => v?.toLowerCase().includes(q))) return false;
      if (companyFilter === NO_COMPANY && u.companyName) return false;
      if (companyFilter !== "all" && companyFilter !== NO_COMPANY && u.companyName !== companyFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "disabled" && u.isActive) return false;
      return true;
    });
  }, [users, search, companyFilter, statusFilter]);

  const toggleActive = async (user: AdminUser) => {
    setBusyUserId(user.id);
    try {
      await setAdminUserStatus(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u)));
      toast({
        title: user.isActive ? "Login disabled" : "Login enabled",
        description: `${user.email} ${user.isActive ? "can no longer sign in" : "can sign in again"}.`,
      });
    } catch (err) {
      toast({ title: "Couldn't change login access", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmDelete = async (typedEmail: string) => {
    if (!deleting) return;
    setBusyUserId(deleting.id);
    try {
      await deleteAdminUser(deleting.id, typedEmail);
      setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
      toast({ title: "User deleted", description: `${deleting.email} was permanently deleted.` });
      setDeleting(null);
    } catch (err) {
      toast({ title: "Couldn't delete user", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) return <LoadingState message="Loading users..." />;
  if (error) return <ErrorState title="Couldn't load users" message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            <SelectItem value={NO_COMPANY}>No company</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {users.length} user{users.length === 1 ? "" : "s"}
      </p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No users match these filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>{u.companyName || <span className="text-muted-foreground">No company</span>}</TableCell>
                      <TableCell>
                        {u.isSuperadmin ? (
                          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
                            <ShieldCheck className="h-3 w-3" />
                            Superadmin
                          </Badge>
                        ) : u.role ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/40 text-destructive">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                            <CircleAlert className="h-3.5 w-3.5" /> Not verified
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{timeAgo(u.lastSignInAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        {!u.isSuperadmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={busyUserId === u.id} aria-label="User actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleActive(u)}>
                                {u.isActive ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" /> Disable login
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" /> Enable login
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleting(u)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmByTypingDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.email ?? "user"}?`}
        consequences={[
          "Permanently delete this user's account and login",
          "Remove them from their company",
          "Keep the company, projects and datasets they created",
        ]}
        confirmText={deleting?.email ?? ""}
        confirmLabel="Delete user"
        busy={!!deleting && busyUserId === deleting.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
