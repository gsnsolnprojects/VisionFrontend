/**
 * The local and live (AWS) apps share one Supabase database. The live site shows only
 * projects the superadmin published (projects.publish_to_live); the local app, running in
 * Vite dev mode, shows every project.
 *
 * Use as `.match(liveProjectFilter)` on every Supabase query that lists or opens projects.
 */
export const liveProjectFilter: { publish_to_live?: boolean } = import.meta.env.PROD ? { publish_to_live: true } : {};
