import React, { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { usePlanAccess } from "@/contexts/plan-access-context";
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
import {
  ArrowRight,
  Check,
  Cpu,
  CreditCard,
  FileCheck2,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  PenTool,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SignupSteps } from "@/components/auth/SignupFormParts";
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

/** The pay button: dark, with a light sweep while it can be pressed */
const PayButton: React.FC<{ action: PlanAction; big?: boolean; light?: boolean }> = ({ action, big, light }) => {
  const live = !action.disabled && !action.loading;
  return (
    <motion.button
      type="button"
      disabled={action.disabled || action.loading}
      onClick={action.onClick}
      whileHover={live ? { y: -2 } : undefined}
      whileTap={live ? { scale: 0.98 } : undefined}
      className={cn(
        "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-colors disabled:cursor-not-allowed",
        big ? "h-14 text-base" : "h-11 text-sm",
        light
          ? "bg-[#e9ff65] text-[#171f1b] disabled:bg-white/15 disabled:text-white/60"
          : "bg-[#171f1b] text-white shadow-[0_10px_30px_-12px_rgba(23,31,27,0.8)] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
      )}
    >
      {live && (
        <motion.span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent to-transparent",
            light ? "via-white/60" : "via-[#e9ff65]/25"
          )}
          initial={{ left: "-40%" }}
          animate={{ left: "120%" }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
        />
      )}
      {action.loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      <span className="relative">{action.label}</span>
      {live && <ArrowRight className={cn("relative h-4 w-4 transition-transform group-hover:translate-x-1", light ? "" : "text-[#e9ff65]")} aria-hidden="true" />}
    </motion.button>
  );
};

const FIRST_WEEK = [
  { icon: PenTool, title: "Label", text: "Start from a GSN sample or upload your own photos, and box the defects." },
  { icon: Cpu, title: "Train", text: "Train your own model on a cloud GPU in minutes." },
  { icon: ScanSearch, title: "Test", text: "See what it finds on photos it has never seen." },
  { icon: FileCheck2, title: "Report", text: "Turn the results into a report for your team." },
];

const TRUST = [
  { icon: ShieldCheck, text: "Secure payment by Razorpay" },
  { icon: CreditCard, text: "UPI, cards or netbanking" },
  { icon: RefreshCw, text: "Renews monthly, cancel anytime" },
];

/** The featured plan: big, dark, with what's included, the first week, and the pay button */
const FeaturedPlan: React.FC<{ plan: Plan; action: PlanAction; fromSignup: boolean }> = ({ plan, action, fromSignup }) => {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className="relative overflow-hidden rounded-3xl bg-[#171f1b] text-[#f5f5ee] shadow-[0_30px_80px_-30px_rgba(23,31,27,0.7)]"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-labelledby="featured-plan"
    >
      {/* Moving glow and dot grid behind the card */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(233,255,101,0.18), transparent 65%)" }}
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(#e9ff65 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* What you get and the price */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9ff65] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#171f1b]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {fromSignup ? "Your pick" : "Best place to start"}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#a4b797]">{plan.tagline}</span>
          </div>
          <h2 id="featured-plan" className="mt-4 text-4xl font-normal tracking-tight sm:text-5xl">
            {plan.name.replace(" Edition", "")}
          </h2>
          <p className="mt-2 text-[15px] text-[#b9c7b2]">Best for {plan.bestFor.toLowerCase()}.</p>

          <div className="mt-6 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-[#e9ff65] sm:text-6xl">{formatInr(plan.priceMonthlyInr)}</span>
            <span className="pb-2 text-sm text-[#a4b797]">/ month</span>
          </div>

          <ul className="mt-6 space-y-2.5">
            {plan.highlights.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-start gap-2.5 text-[15px]"
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.35 }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e9ff65]/15">
                  <Check className="h-3.5 w-3.5 text-[#e9ff65]" aria-hidden="true" />
                </span>
                {item}
              </motion.li>
            ))}
          </ul>

          <div className="mt-8">
            <PayButton action={action} big light />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#a4b797]">
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[#88a530]" aria-hidden="true" /> {text}
              </li>
            ))}
          </ul>
        </div>

        {/* The first week, as a timeline */}
        <div className="rounded-2xl border border-[#33433a] bg-[#1c2620]/80 p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#e9ff65]">Your first week</p>
          <p className="mt-1 text-sm text-[#b9c7b2]">Everything happens in your browser. No code needed.</p>
          <ol className="relative mt-5 space-y-5">
            <span aria-hidden="true" className="absolute bottom-3 left-[17px] top-3 w-px bg-[#33433a]" />
            {FIRST_WEEK.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                className="relative flex gap-4"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.12, duration: 0.4 }}
              >
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#425140] bg-[#171f1b]">
                  <Icon className="h-4 w-4 text-[#e9ff65]" aria-hidden="true" />
                </span>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-[#f5f5ee]">
                    <span className="mr-1.5 font-mono text-xs text-[#7f927a]">0{i + 1}</span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#a4b797]">{text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </motion.section>
  );
};

/** The other plans: lighter cards next to each other */
const PlanCard: React.FC<{ plan: Plan; isCurrent: boolean; action: PlanAction; index: number }> = ({ plan, isCurrent, action, index }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg",
        isCurrent && "border-[#9ab51f] ring-2 ring-[#e9ff65]/50"
      )}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {isCurrent && <Badge className="bg-[#171f1b] text-[#e9ff65] hover:bg-[#171f1b]">Current</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      <div className="mt-4">
        <span className="text-3xl font-bold tracking-tight">{formatInr(plan.priceMonthlyInr)}</span>
        <span className="text-sm text-muted-foreground"> / month</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Best for: {plan.bestFor}</p>
      <ul className="mb-6 mt-5 flex-1 space-y-2">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6f8f1d]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <PayButton action={action} />
    </motion.div>
  );
};

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
  // Someone choosing a plan for the first time (no plan yet, never had one) gets the plan picker first
  const choosing = viewOnly && access.reason === "no_plan";
  // The plan shown big: the one picked at sign-up, else Playground
  const featured = choosing ? plans.find((p) => p.id === (pickedPlan ?? "playground")) ?? null : null;
  const others = featured ? plans.filter((p) => p.id !== featured.id) : plans;

  const actionFor = (plan: Plan): PlanAction => {
    const isCurrent = currentPlan?.id === plan.id && hasActivePaidPlan;
    if (isCurrent) return { label: "Current plan", disabled: true };
    if (!billing.paymentsEnabled) return { label: "Online payment coming soon", disabled: true };
    if (!billing.canManage) return { label: "Only your workspace admin can choose", disabled: true };
    if (hasActivePaidPlan) return { label: "Cancel current plan to switch", disabled: true };
    const name = plan.name.replace(" Edition", "");
    return {
      label: plan.id === featured?.id ? `Start ${name} for ${formatInr(plan.priceMonthlyInr)}/month` : `Choose ${name}`,
      disabled: busyPlan !== null,
      loading: busyPlan === plan.id,
      onClick: () => onChoosePlan(plan),
    };
  };

  return (
    <motion.div className="space-y-8" variants={fadeInUpVariants} initial="hidden" animate="visible">
      {choosing ? (
        <div className="space-y-3">
          {/* Coming from the sign-up link: the last of its three steps */}
          {pickedPlan && <SignupSteps current={2} />}
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Choose your plan.</h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Your account is ready. Pick a plan to start creating projects, training models and running inspections. Everyone in your
            organisation shares it.
          </p>
        </div>
      ) : (
        viewOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Your workspace is view-only</AlertTitle>
            <AlertDescription>Your subscription is not active. Renew it to continue working. Your existing data stays visible.</AlertDescription>
          </Alert>
        )
      )}

      {featured && <FeaturedPlan plan={featured} action={actionFor(featured)} fromSignup={pickedPlan === featured.id} />}

      {!choosing && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>Your organisation's subscription</CardDescription>
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
              {currentPlan && <p className="text-sm text-muted-foreground">{formatInr(currentPlan.priceMonthlyInr)} / month</p>}
              {paidUntil && hasActivePaidPlan && (
                <p className="text-sm text-muted-foreground">
                  {subscription?.cancelAtPeriodEnd ? `Cancelled. You keep access until ${paidUntil}.` : `Renews on ${paidUntil}`}
                </p>
              )}
              {paidUntil && !hasActivePaidPlan && access.reason !== "unlimited" && (
                <p className="text-sm text-muted-foreground">Ended on {paidUntil}</p>
              )}
              {access.reason === "unlimited" && (
                <p className="text-sm text-muted-foreground">Internal workspace with full access and no limits, set by GSN for testing.</p>
              )}
              {hasActivePaidPlan && billing.canManage && !subscription?.cancelAtPeriodEnd && (
                <Button variant="outline" size="sm" onClick={onCancelClick} disabled={cancelling}>
                  {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel subscription
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>What your organisation is using against its plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage ? (
                <>
                  <UsageRow label="Users" used={usage.users} limit={access.limits.users} />
                  <UsageRow label="Projects" used={usage.projects} limit={access.limits.projects} />
                  <UsageRow label="Live camera streams (running now)" used={usage.liveCameraStreams} limit={access.limits.liveCameraStreams} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Join or create an organisation to see usage.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold">{featured ? "Ready for your production line?" : "Plans"}</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          {featured
            ? "When you're ready to inspect live on your line, move up to a bigger plan."
            : "Billed monthly per organisation through Razorpay (UPI, cards, netbanking). Everyone in your organisation shares the plan."}{" "}
          <Link to="/refunds" className="underline">
            Refund &amp; cancellation policy
          </Link>
        </p>
        <div className={cn("grid gap-4", others.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {others.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} isCurrent={currentPlan?.id === plan.id && hasActivePaidPlan} action={actionFor(plan)} />
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
      toast({ title: "Payment successful", description: `Your organisation is now on the ${plan.name}.` });
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
              You won't be charged again. Your organisation keeps full access until{" "}
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
