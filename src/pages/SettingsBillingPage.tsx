import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { usePlanAccess } from "@/contexts/plan-access-context";
import { PageHeader } from "@/components/pages/PageHeader";
import { LoadingState } from "@/components/pages/LoadingState";
import { ErrorState } from "@/components/pages/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Infinity as InfinityIcon, Loader2, Lock } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { cn } from "@/lib/utils";
import {
  cancelSubscription,
  getSubscription,
  startCheckout,
  verifyCheckout,
  type Plan,
  type PlanId,
  type SubscriptionResponse,
} from "@/lib/api/subscription";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { Link } from "react-router-dom";
import { clearSignupPlan, getSignupPlan } from "@/lib/signupPlan";

const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  unlimited: { label: "Unlimited (internal)", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  past_due: { label: "Payment due", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  expired: { label: "Expired", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
  no_plan: { label: "No plan", className: "bg-muted text-muted-foreground border-border" },
  none: { label: "No plan", className: "bg-muted text-muted-foreground border-border" },
};

const UsageRow: React.FC<{ label: string; used: number; limit: number | null }> = ({ label, used, limit }) => {
  const unlimited = limit === null;
  const percentage = unlimited || !limit ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {unlimited ? "Unlimited" : limit}
        </span>
      </div>
      <Progress value={unlimited ? 0 : percentage} className="h-2" />
    </div>
  );
};

interface PlanAction {
  label: string;
  disabled: boolean;
  onClick?: () => void;
  loading?: boolean;
}

/** picked: the plan chosen on the landing page before signing up */
const PlanCard: React.FC<{ plan: Plan; isCurrent: boolean; picked: boolean; action: PlanAction }> = ({
  plan,
  isCurrent,
  picked,
  action,
}) => (
  <Card className={cn("flex flex-col", (isCurrent || picked) && "border-primary", picked && "ring-1 ring-primary/30")}>
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{plan.name}</CardTitle>
        {isCurrent && <Badge>Current</Badge>}
        {picked && !isCurrent && <Badge variant="outline">Your pick</Badge>}
      </div>
      <CardDescription>{plan.tagline}</CardDescription>
      <div className="pt-2">
        <span className="text-3xl font-bold">{formatInr(plan.priceMonthlyInr)}</span>
        <span className="text-sm text-muted-foreground"> / month</span>
      </div>
      <p className="text-xs text-muted-foreground">Best for: {plan.bestFor}</p>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col">
      <ul className="mb-6 flex-1 space-y-2">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>
      <Button
        className="w-full"
        variant={isCurrent ? "outline" : "default"}
        disabled={action.disabled || action.loading}
        onClick={action.onClick}
      >
        {action.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {action.label}
      </Button>
    </CardContent>
  </Card>
);

interface BillingContentProps {
  data: SubscriptionResponse;
  busyPlan: PlanId | null;
  cancelling: boolean;
  onChoosePlan: (plan: Plan) => void;
  onCancelClick: () => void;
}

const BillingContent: React.FC<BillingContentProps> = ({ data, busyPlan, cancelling, onChoosePlan, onCancelClick }) => {
  const { plans, subscription, access, usage, billing } = data;
  const currentPlan = plans.find((p) => p.id === (subscription?.plan ?? access.plan)) ?? null;
  const status = STATUS_LABELS[access.reason] ?? STATUS_LABELS.no_plan;
  const paidUntil = formatDate(subscription?.currentPeriodEnd);
  const viewOnly = access.mode === "view_only";
  const hasActivePaidPlan = !!subscription?.hasPaidSubscription && subscription.status === "active";
  const pickedPlan = hasActivePaidPlan ? null : getSignupPlan();

  const actionFor = (plan: Plan): PlanAction => {
    const isCurrent = currentPlan?.id === plan.id && hasActivePaidPlan;
    if (isCurrent) return { label: "Current plan", disabled: true };
    if (!billing.paymentsEnabled) return { label: "Online payment coming soon", disabled: true };
    if (!billing.canManage) return { label: "Only your workspace admin can choose", disabled: true };
    if (hasActivePaidPlan) return { label: "Cancel current plan to switch", disabled: true };
    return {
      label: `Choose ${plan.name.replace(" Edition", "")}`,
      disabled: busyPlan !== null,
      loading: busyPlan === plan.id,
      onClick: () => onChoosePlan(plan),
    };
  };

  return (
    <motion.div className="space-y-6" variants={fadeInUpVariants} initial="hidden" animate="visible">
      {viewOnly && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Your workspace is view-only</AlertTitle>
          <AlertDescription>
            {access.reason === "no_plan"
              ? "Choose a plan to create projects, train models, run inspections and add team members. Your existing data stays visible."
              : "Your subscription is not active. Renew it to continue working. Your existing data stays visible."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your company's subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold">
                {access.reason === "unlimited" && !currentPlan ? "Unlimited access" : currentPlan?.name ?? "No plan"}
              </h3>
              <Badge variant="outline" className={status.className}>
                {access.reason === "unlimited" && <InfinityIcon className="mr-1 h-3 w-3" />}
                {status.label}
              </Badge>
            </div>
            {currentPlan && (
              <p className="text-sm text-muted-foreground">{formatInr(currentPlan.priceMonthlyInr)} / month</p>
            )}
            {paidUntil && hasActivePaidPlan && (
              <p className="text-sm text-muted-foreground">
                {subscription?.cancelAtPeriodEnd
                  ? `Cancelled. You keep access until ${paidUntil}.`
                  : `Renews on ${paidUntil}`}
              </p>
            )}
            {paidUntil && !hasActivePaidPlan && access.reason !== "unlimited" && (
              <p className="text-sm text-muted-foreground">Ended on {paidUntil}</p>
            )}
            {access.reason === "unlimited" && (
              <p className="text-sm text-muted-foreground">
                Internal workspace with full access and no limits, set by GSN for testing.
              </p>
            )}
            {hasActivePaidPlan && billing.canManage && !subscription?.cancelAtPeriodEnd && (
              <Button variant="outline" size="sm" onClick={onCancelClick} disabled={cancelling}>
                {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel subscription
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>What your company is using against its plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage ? (
              <>
                <UsageRow label="Users" used={usage.users} limit={access.limits.users} />
                <UsageRow label="Projects" used={usage.projects} limit={access.limits.projects} />
                <UsageRow
                  label="Live camera streams (running now)"
                  used={usage.liveCameraStreams}
                  limit={access.limits.liveCameraStreams}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Join or create a company to see usage.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Plans</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Billed monthly per company through Razorpay (UPI, cards, netbanking). Everyone in your company shares the plan.{" "}
          <Link to="/refunds" className="underline">
            Refund &amp; cancellation policy
          </Link>
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlan?.id === plan.id && hasActivePaidPlan}
              picked={pickedPlan === plan.id}
              action={actionFor(plan)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const SettingsBillingPage: React.FC = () => {
  const { sessionReady, user, profile, loading } = useProfile();
  const { toast } = useToast();
  const planAccess = usePlanAccess();
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadSubscription = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      setData(await getSubscription());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionReady && user) loadSubscription();
  }, [sessionReady, user, loadSubscription]);

  const handleChoosePlan = async (plan: Plan) => {
    setBusyPlan(plan.id);
    try {
      const session = await startCheckout(plan.id);
      const outcome = await openRazorpayCheckout(
        session,
        { name: profile?.name, email: profile?.email ?? user?.email, contact: profile?.phone },
        (message) => toast({ title: "Payment failed", description: message, variant: "destructive" })
      );
      if (outcome.status === "dismissed") return;

      await verifyCheckout(outcome.result);
      clearSignupPlan();
      toast({ title: "Payment successful", description: `Your company is now on the ${plan.name}.` });
      await Promise.all([loadSubscription(false), planAccess.refresh()]);
    } catch (err) {
      toast({
        title: "Payment could not be completed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyPlan(null);
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      const { cancelsOn } = await cancelSubscription();
      const date = formatDate(cancelsOn);
      toast({
        title: "Subscription cancelled",
        description: date ? `You keep full access until ${date}.` : "You keep full access until the end of the paid month.",
      });
      await loadSubscription(false);
    } catch (err) {
      toast({
        title: "Could not cancel",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!sessionReady || loading) {
    return <LoadingState message="Loading billing information..." />;
  }

  if (sessionReady && !user) {
    return null; // Will be redirected by ProtectedRoutes
  }

  return (
    <div>
      <PageHeader title="Billing & Subscription" description="Your company's plan, limits and usage" />
      {isLoading ? (
        <LoadingState message="Loading billing information..." />
      ) : error || !data ? (
        <ErrorState
          title="Couldn't load billing information"
          message={error ?? "Please try again."}
          onRetry={() => loadSubscription()}
        />
      ) : (
        <BillingContent
          data={data}
          busyPlan={busyPlan}
          cancelling={cancelling}
          onChoosePlan={handleChoosePlan}
          onCancelClick={() => setConfirmCancel(true)}
        />
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't be charged again. Your company keeps full access until{" "}
              {formatDate(data?.subscription?.currentPeriodEnd) ?? "the end of the paid month"}, then the workspace
              becomes view-only. Your data is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancel subscription</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
