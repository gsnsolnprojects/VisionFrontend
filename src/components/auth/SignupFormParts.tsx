import React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft, Check, ExternalLink, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ResendVerification } from "@/components/auth/ResendVerification";

/** Pieces of the sign-up form on /auth?mode=signup (the client sign-up link /start lands there) */

/** Fields come in one after another */
export const fieldMotion: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.4, ease: "easeOut" } }),
};

/** A labelled field with an icon at the start of the box; the box itself is passed as children */
export const IconField: React.FC<{
  id: string;
  label: string;
  icon: React.ElementType;
  index: number;
  error?: string | null;
  children: React.ReactNode;
}> = ({ id, label, icon: Icon, index, error, children }) => (
  <motion.div custom={index} variants={fieldMotion} initial="hidden" animate="visible" className="space-y-1.5">
    <Label htmlFor={id} className="text-[13px] font-semibold text-[#2b3530]">
      {label}
    </Label>
    <div className="group relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8a968c] transition-colors group-focus-within:text-[#171f1b]"
        aria-hidden="true"
      />
      {children}
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          className="text-xs text-destructive"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </motion.div>
);

/** Shared look for the boxes: tall, soft, with a green ring on focus */
export const inputClass = (invalid?: boolean) =>
  cn(
    "h-12 rounded-xl border-[#dfe3d6] bg-[#fbfbf7] pl-10 text-[15px] shadow-none transition-all placeholder:text-[#a3ab9f]",
    "focus-visible:border-[#88a530] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#e9ff65]/40 focus-visible:ring-offset-0",
    invalid && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15"
  );

export const PASSWORD_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "lowercase", test: (p: string) => /[a-z]/.test(p) },
  { label: "UPPERCASE", test: (p: string) => /[A-Z]/.test(p) },
  { label: "number", test: (p: string) => /[0-9]/.test(p) },
  { label: "symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Too weak", color: "#e5484d" },
  { label: "Weak", color: "#f08c3a" },
  { label: "Getting there", color: "#e2b93b" },
  { label: "Almost", color: "#9ab51f" },
  { label: "Strong", color: "#3f8f3a" },
];

/** The password rules as chips that turn green as each one is met, with a strength bar */
export const PasswordRules: React.FC<{ password: string }> = ({ password }) => {
  const met = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = STRENGTH[Math.max(0, met - 1)];
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {PASSWORD_RULES.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e6e9df]">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{ width: i < met ? "100%" : "0%", backgroundColor: strength.color }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>
        <span className="shrink-0 whitespace-nowrap text-right text-[11px] font-semibold" style={{ color: password ? strength.color : "#a3ab9f" }}>
          {password ? strength.label : "Password strength"}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Password needs">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <motion.li
              key={r.label}
              layout
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                ok ? "border-[#9ab51f]/50 bg-[#e9ff65]/40 text-[#2f4a12]" : "border-[#e1e5da] bg-white text-[#7d877c]"
              )}
            >
              <AnimatePresence initial={false}>
                {ok && (
                  <motion.span initial={{ scale: 0, width: 0 }} animate={{ scale: 1, width: "auto" }} exit={{ scale: 0, width: 0 }}>
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </motion.span>
                )}
              </AnimatePresence>
              {r.label}
              <span className="sr-only">{ok ? " (done)" : " (needed)"}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
};

/** Where the person is in the journey: account, then email, then plan */
export const SignupSteps: React.FC<{ current: 0 | 1 | 2 }> = ({ current }) => {
  const steps = ["Create account", "Verify email", "Choose plan"];
  return (
    <ol className="flex items-center gap-2" aria-label="Sign-up steps">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s}>
            <li className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  done && "bg-[#171f1b] text-[#e9ff65]",
                  active && "bg-[#e9ff65] text-[#171f1b] ring-4 ring-[#e9ff65]/30",
                  !done && !active && "bg-[#eceee6] text-[#8a968c]"
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              {/* On phones only the current step is named */}
              <span className={cn("whitespace-nowrap text-[11px] font-semibold", active ? "text-[#171f1b]" : "hidden text-[#8a968c] sm:inline")}>{s}</span>
            </li>
            {i < steps.length - 1 && (
              <li aria-hidden="true" className="h-px min-w-[12px] flex-1 overflow-hidden bg-[#e1e5da]">
                <motion.div className="h-full bg-[#171f1b]" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
};

/** The person's mailbox on the web, for the big "Open" button (common providers only) */
const mailboxFor = (email: string): { name: string; url: string } | null => {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" };
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return { name: "Outlook", url: "https://outlook.live.com/mail/" };
  if (/^(yahoo|ymail)\./.test(domain)) return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
  return null;
};

/** Shown after signing up: the email has been sent, open it, or send it again */
export const CheckEmail: React.FC<{ email: string; onBack: () => void; onSignIn: () => void }> = ({ email, onBack, onSignIn }) => {
  const reduced = useReducedMotion();
  const mailbox = mailboxFor(email);
  return (
    <motion.div className="space-y-6 text-center" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        {!reduced && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[#e9ff65]"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}
        <motion.span
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#171f1b] text-[#e9ff65]"
          initial={reduced ? false : { rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
        >
          <MailCheck className="h-9 w-9" aria-hidden="true" />
        </motion.span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#171f1b]">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-[#5d675e]">
          We sent a verification link to <span className="font-semibold text-[#171f1b]">{email}</span>. Click it to confirm your email, then
          you&apos;ll choose your plan.
        </p>
      </div>

      {mailbox && (
        <a
          href={mailbox.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171f1b] text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Open {mailbox.name} <ExternalLink className="h-4 w-4 text-[#e9ff65]" aria-hidden="true" />
        </a>
      )}

      <div className="space-y-2 rounded-2xl border border-[#e1e5da] bg-[#fbfbf7] p-4 text-left">
        <p className="text-sm font-semibold text-[#171f1b]">Didn&apos;t get it?</p>
        <p className="text-xs text-[#6b766c]">It can take a minute. Check your spam or promotions folder, or send it again.</p>
        <ResendVerification initialEmail={email} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[#5d675e] hover:text-[#171f1b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Use a different email
        </button>
        <button type="button" onClick={onSignIn} className="font-semibold text-[#171f1b] underline-offset-4 hover:underline">
          Already verified? Sign in
        </button>
      </div>
    </motion.div>
  );
};
