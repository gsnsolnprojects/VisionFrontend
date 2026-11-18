import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Clock, CloudOff, Loader2, UserPlus, XCircle } from "lucide-react";
import { arrivedAt } from "@/lib/notificationTime";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { getLevels, type LevelProgress } from "@/lib/api/levels";

/**
 * The bell for Playground students: the state of their Level 2 training run (waiting for a GPU,
 * training, done or failed), so they don't have to keep the Train page open. When the run starts or
 * ends while they're in the app, a message pops up too. A workspace admin also finds join requests
 * here. Checked every minute; what they've already seen is remembered in this browser.
 */

const POLL_MS = 60 * 1000;
const seenKey = (userId?: string) => `visionm_training_notice_${userId ?? "anon"}`;

type Remembered = { jobId: string; status: string; read: boolean };

const readRemembered = (userId?: string): Remembered | null => {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return raw ? (JSON.parse(raw) as Remembered) : null;
  } catch {
    return null;
  }
};

const remember = (userId: string | undefined, value: Remembered) => {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(value));
  } catch {
    // a convenience only
  }
};

/** The student's latest training run, from their levels */
const latestRun = (levels: LevelProgress[]) =>
  levels
    .filter((l) => l.trainingJobId && l.training && l.projectId)
    .sort((a, b) => new Date(b.training?.queuedAt ?? 0).getTime() - new Date(a.training?.queuedAt ?? 0).getTime())[0] ?? null;

const waitedText = (since?: string) => {
  if (!since) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
  if (minutes < 1) return "just now";
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const describe = (level: LevelProgress) => {
  const t = level.training!;
  const project = level.mission ?? "your project";
  switch (t.status) {
    case "queued":
      return t.noGpuAvailable
        ? {
            Icon: CloudOff,
            tone: "text-amber-600 dark:text-amber-400",
            title: "Training is waiting for a GPU",
            text: `${project}: AWS has no GPU free in Mumbai right now. Waiting ${waitedText(t.queuedAt)}; we try every 2 minutes and it starts by itself.`,
          }
        : { Icon: Loader2, tone: "text-ring", title: "Training is about to start", text: `${project}: in line for a training computer.` };
    case "running":
      return { Icon: Loader2, tone: "text-ring", title: "Your model is training", text: `${project}: it keeps going while you're away.` };
    case "completed":
      return { Icon: CheckCircle2, tone: "text-success", title: "Your model is ready", text: `${project}: test it on photos it never learned from.` };
    default:
      return { Icon: XCircle, tone: "text-destructive", title: "Training didn't finish", text: `${project}: open it to see why and start again.` };
  }
};

/** Status changes worth a pop-up message */
const POPUP: Record<string, { title: string; description: string }> = {
  running: { title: "Training has started", description: "A GPU was found and your model is training now." },
  completed: { title: "Your model is ready", description: "Training finished. Open step 3 to test it." },
  failed: { title: "Training didn't finish", description: "Open the Train step to see why." },
};

export const PlaygroundBell: React.FC<{
  joinRequestCount?: number;
  onOpenJoinRequests?: () => void;
}> = ({ joinRequestCount = 0, onOpenJoinRequests }) => {
  const navigate = useNavigate();
  const { user } = useProfile();
  const { toast } = useToast();
  const [run, setRun] = useState<LevelProgress | null>(null);
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const check = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { levels } = await getLevels();
      const latest = latestRun(levels);
      setRun(latest);
      if (!latest?.trainingJobId || !latest.training) return;
      const status = latest.training.status;
      const before = readRemembered(user.id);
      if (before?.jobId === latest.trainingJobId && before.status === status) {
        setUnread(!before.read);
        return;
      }
      // A change since last time: a new run, or this one started or ended
      const changed = before?.jobId === latest.trainingJobId;
      if (changed && POPUP[status]) toastRef.current(POPUP[status]);
      remember(user.id, { jobId: latest.trainingJobId, status, read: false });
      setUnread(true);
    } catch {
      // try again next time
    }
  }, [user?.id]);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && run?.trainingJobId && run.training) {
      remember(user?.id, { jobId: run.trainingJobId, status: run.training.status, read: true });
      setUnread(false);
    }
  };

  const notice = run?.training ? describe(run) : null;
  // When this notice arrived: the run's latest change (queued, started, finished)
  const t = run?.training;
  const noticeTime = t
    ? arrivedAt(
        t.status === "completed" || t.status === "failed" || t.status === "cancelled"
          ? t.completedAt ?? t.startedAt ?? t.queuedAt
          : t.status === "running"
            ? t.startedAt ?? t.queuedAt
            : t.queuedAt
      )
    : null;
  const badge = (unread && notice ? 1 : 0) + joinRequestCount;
  const openRun = () => {
    if (!run?.projectId) return;
    setOpen(false);
    navigate(`/dataset/${run.projectId}?step=${run.training?.status === "completed" ? "test" : "train"}`);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-muted"
          aria-label={badge ? `Notifications, ${badge} new` : "Notifications"}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 text-sm font-semibold text-foreground">Notifications</p>
        <div className="divide-y">
          {notice && (
            <button type="button" onClick={openRun} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted">
              <notice.Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${notice.tone} ${notice.Icon === Loader2 ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{notice.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{notice.text}</span>
                {noticeTime && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {noticeTime}
                  </span>
                )}
              </span>
            </button>
          )}
          {joinRequestCount > 0 && onOpenJoinRequests && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenJoinRequests();
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-ring" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">
                {joinRequestCount} join request{joinRequestCount === 1 ? "" : "s"}
              </span>
            </button>
          )}
          {!notice && joinRequestCount === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing new. Training updates show up here.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
