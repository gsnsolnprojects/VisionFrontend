/**
 * Sign-in for the web app, talking to our own backend (/api/auth). Replaces supabase.auth.
 *
 * - The refresh token lives in an httpOnly cookie set by the API (scripts can't read it).
 * - The access token (15 minutes) is kept in memory only and renewed shortly before it expires.
 * - Return values use the same { data, error } shapes supabase.auth had, so screens changed little.
 * - Signing in or out in one tab is passed on to the other open tabs.
 */
import { API_BASE_URL } from "@/lib/api/apiBase";

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

export interface Session {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number; // seconds since epoch
  user: AuthUser;
}

export type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED";

export interface AuthError {
  message: string;
  status: number;
  code: string | null;
}

type Result<T> = { data: T; error: AuthError | null };
type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const REFRESH_EARLY_SECONDS = 60;

let session: Session | null = null;
let initPromise: Promise<void> | null = null;
let refreshPromise: Promise<Session | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("vm-auth") : null;

const authUrl = (path: string) => `${API_BASE_URL.replace(/\/+$/, "")}/auth/${path.replace(/^\/+/, "")}`;

function toError(status: number, body: any, fallback = "Something went wrong. Please try again."): AuthError {
  return {
    message: body?.message || body?.error || fallback,
    status,
    code: body?.code || null,
  };
}

async function post(path: string, body?: unknown, withToken = false): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withToken && session) headers.Authorization = `Bearer ${session.access_token}`;
  try {
    const res = await fetch(authUrl(path), {
      method: "POST",
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  } catch {
    return { status: 0, body: { message: "Can't reach the server. Check your connection and try again." } };
  }
}

function emit(event: AuthChangeEvent) {
  for (const listener of [...listeners]) {
    try {
      listener(event, session);
    } catch (err) {
      console.error("[auth] listener failed:", err);
    }
  }
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!session) return;
  const ms = Math.max(5_000, (session.expires_at - REFRESH_EARLY_SECONDS) * 1000 - Date.now());
  refreshTimer = setTimeout(() => {
    void refreshNow("TOKEN_REFRESHED");
  }, ms);
}

function setSession(next: Session | null, event: AuthChangeEvent | null, broadcast = false) {
  session = next;
  scheduleRefresh();
  if (event) emit(event);
  if (broadcast && channel) channel.postMessage({ type: event });
}

/** One refresh at a time (several callers share it). event null = don't notify listeners. */
function refreshNow(event: AuthChangeEvent | null = "TOKEN_REFRESHED"): Promise<Session | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const r = await post("refresh");
      if (r.status === 200 && r.body?.session) {
        setSession(r.body.session, event);
        return session;
      }
      // 0 = offline: keep what we have and try again later
      if (r.status === 0) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void refreshNow("TOKEN_REFRESHED"), 15_000);
        return session;
      }
      const hadSession = !!session;
      setSession(null, hadSession ? "SIGNED_OUT" : null);
      return null;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Restore the sign-in from the cookie once, when the app starts (each listener then gets INITIAL_SESSION) */
function init(): Promise<void> {
  if (!initPromise) {
    initPromise = refreshNow(null).then(() => undefined);
  }
  return initPromise;
}

channel?.addEventListener("message", (msg) => {
  const type = msg.data?.type as AuthChangeEvent | undefined;
  if (type === "SIGNED_OUT") setSession(null, "SIGNED_OUT");
  else if (type === "SIGNED_IN" || type === "USER_UPDATED") void refreshNow(type);
});

// Coming back to a tab that slept (laptop lid, background tab): renew if the token is stale
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && session && session.expires_at * 1000 - Date.now() < REFRESH_EARLY_SECONDS * 1000) {
      void refreshNow("TOKEN_REFRESHED");
    }
  });
}

function sessionResult(r: { status: number; body: any }, event: AuthChangeEvent): Result<{ session: Session | null; user: AuthUser | null }> {
  if (r.status !== 200) return { data: { session: null, user: null }, error: toError(r.status, r.body) };
  if (r.body?.session) setSession(r.body.session, event, true);
  return { data: { session: r.body?.session || null, user: r.body?.user || null }, error: null };
}

export const auth = {
  /** The current session, renewed first if it's about to expire */
  async getSession(): Promise<Result<{ session: Session | null }>> {
    await init();
    if (session && session.expires_at * 1000 - Date.now() < REFRESH_EARLY_SECONDS * 1000) {
      await refreshNow("TOKEN_REFRESHED");
    }
    return { data: { session }, error: null };
  },

  async getUser(): Promise<Result<{ user: AuthUser | null }>> {
    const { data } = await auth.getSession();
    return { data: { user: data.session?.user || null }, error: null };
  },

  /** Ask the server for a new access token now */
  async refreshSession(): Promise<Result<{ session: Session | null }>> {
    const s = await refreshNow("TOKEN_REFRESHED");
    return s
      ? { data: { session: s }, error: null }
      : { data: { session: null }, error: { message: "Invalid Refresh Token: session ended", status: 401, code: "refresh_failed" } };
  },

  /** Same contract as supabase.auth.onAuthStateChange; INITIAL_SESSION is sent first */
  onAuthStateChange(callback: Listener) {
    listeners.add(callback);
    // Every subscriber hears INITIAL_SESSION exactly once, after the cookie check finishes
    void init().then(() => {
      setTimeout(() => {
        if (listeners.has(callback)) callback("INITIAL_SESSION", session);
      }, 0);
    });
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    return sessionResult(await post("login", { email, password }), "SIGNED_IN");
  },

  /**
   * Create an account. Without inviteToken a confirmation email is sent and session is null.
   * With a valid inviteToken for this email the person is signed in straight away.
   */
  async signUp({ email, password, options, inviteToken }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    inviteToken?: string;
  }) {
    const r = await post("signup", {
      email,
      password,
      data: options?.data,
      redirectTo: options?.emailRedirectTo,
      inviteToken,
    });
    return sessionResult(r, "SIGNED_IN");
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    await post("logout");
    setSession(null, "SIGNED_OUT", true);
    return { error: null };
  },

  /** Sign out on every device */
  async signOutEverywhere(): Promise<{ error: AuthError | null }> {
    await post("logout-all", {}, true);
    setSession(null, "SIGNED_OUT", true);
    return { error: null };
  },

  /** Change the password (currentPassword is required when the account already has one) */
  async updateUser({ password, currentPassword }: { password: string; currentPassword?: string }): Promise<Result<{ user: AuthUser | null }>> {
    await init();
    const r = await post("change-password", { newPassword: password, currentPassword }, true);
    if (r.status !== 200) return { data: { user: null }, error: toError(r.status, r.body) };
    await refreshNow("USER_UPDATED");
    return { data: { user: session?.user || null }, error: null };
  },

  async resetPasswordForEmail(email: string): Promise<{ error: AuthError | null }> {
    const r = await post("forgot-password", { email });
    return { error: r.status === 200 ? null : toError(r.status, r.body) };
  },

  /** Choose a new password from the emailed reset link */
  async resetPassword(token: string, password: string): Promise<{ error: AuthError | null }> {
    const r = await post("reset-password", { token, password });
    return { error: r.status === 200 ? null : toError(r.status, r.body) };
  },

  async resend({ email, options }: { type?: "signup"; email: string; options?: { emailRedirectTo?: string } }): Promise<{ error: AuthError | null }> {
    const r = await post("resend-verification", { email, redirectTo: options?.emailRedirectTo });
    return { error: r.status === 200 ? null : toError(r.status, r.body) };
  },

  /** Confirm the email from the emailed link; signs the person in */
  async verifyEmail(token: string) {
    const r = await post("verify-email", { token });
    const result = sessionResult(r, "SIGNED_IN");
    return { ...result, redirectTo: (r.body?.redirect_to as string) || "/dashboard" };
  },

  /** Email a one-time sign-in link (used by organisation invites) */
  async signInWithOtp({ email, options }: { email: string; options?: { emailRedirectTo?: string } }): Promise<{ error: AuthError | null }> {
    const r = await post("magic-link", { email, redirectTo: options?.emailRedirectTo });
    return { error: r.status === 200 ? null : toError(r.status, r.body) };
  },

  /** Sign in from the emailed one-time link */
  async magicLogin(token: string) {
    const r = await post("magic-login", { token });
    const result = sessionResult(r, "SIGNED_IN");
    return { ...result, redirectTo: (r.body?.redirect_to as string) || "/dashboard" };
  },

  /** Go to Google; the API brings the person back to redirectTo (a path in this app) signed in */
  async signInWithOAuth({ options }: { provider: "google"; options?: { redirectTo?: string } }): Promise<{ error: AuthError | null }> {
    let redirectTo = options?.redirectTo || "/dashboard";
    try {
      const u = new URL(redirectTo, window.location.origin);
      if (u.origin === window.location.origin) redirectTo = u.pathname + u.search + u.hash;
    } catch {
      redirectTo = "/dashboard";
    }
    const params = new URLSearchParams({ redirectTo, origin: window.location.origin });
    window.location.assign(`${authUrl("google")}?${params}`);
    return { error: null };
  },

  /** Does an account exist for this email? */
  async checkEmail(email: string): Promise<{ exists: boolean; error: AuthError | null }> {
    const r = await post("check-email", { email });
    return r.status === 200 ? { exists: !!r.body?.exists, error: null } : { exists: false, error: toError(r.status, r.body) };
  },

  /** Current access token or null (no network call unless it needs renewing) */
  async accessToken(): Promise<string | null> {
    const { data } = await auth.getSession();
    return data.session?.access_token || null;
  },
};

export type { Result as AuthResult };
