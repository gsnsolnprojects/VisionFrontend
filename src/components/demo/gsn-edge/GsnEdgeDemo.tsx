import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  BellRing,
  Building2,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  Map as MapIcon,
  MonitorPlay,
  PlugZap,
  RadioTower,
  ServerCog,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { CaseStudies } from "./CaseStudies";
import { ConnectFlow } from "./ConnectFlow";
import { ClosingCta, ProductHero, Section, primaryBtn, secondaryBtn, type Benefit } from "../vision-m/shared";
import { scrollToId } from "../vision-m/media";

const BENEFITS: Benefit[] = [
  { Icon: LayoutDashboard, title: "Everything live", text: "Machines, lifts, vehicles and meters on one screen." },
  { Icon: BellRing, title: "Alarms you set", text: "Warning and critical limits, raised the moment they're crossed." },
  { Icon: FileText, title: "Reports in a click", text: "Export data and PDF reports for any period." },
  { Icon: Building2, title: "Built for many sites", text: "Separate companies, users and roles in one platform." },
];

const FEATURES = [
  { Icon: LayoutDashboard, title: "Live dashboards", text: "A dedicated screen for each asset type, updating on its own." },
  { Icon: MapIcon, title: "Fleet map & replay", text: "Live GPS positions, trip history and route replay." },
  { Icon: UserCheck, title: "Driver attendance", text: "Present, absent and late counts with weekly trends." },
  { Icon: Bell, title: "Alarm rules & history", text: "Set limits once, reuse them, and review every alarm." },
  { Icon: FileText, title: "Reports & export", text: "PDF energy reports and data export for any date range." },
  { Icon: MonitorPlay, title: "Kiosk mode", text: "Full-screen view for the control-room TV." },
  { Icon: Building2, title: "Multi-company", text: "Turn dashboards on or off per customer company." },
  { Icon: Users, title: "Users & roles", text: "Admins and users, each kept inside their own company." },
  { Icon: ServerCog, title: "Device registry", text: "Register machines, lifts, meters and trackers with site details." },
  { Icon: CreditCard, title: "Plans & billing", text: "Subscriptions with online renewal built in." },
  { Icon: History, title: "Demo simulator", text: "Simulated devices to try every screen without hardware." },
  { Icon: Smartphone, title: "Works on phones", text: "The same dashboards on any screen size." },
];

function Features() {
  return (
    <Section eyebrow="Platform" title="Everything around the dashboards, too">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.06 }}
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-teal-400/40 hover:bg-teal-400/[0.06]"
          >
            <Icon className="h-5 w-5 text-teal-300 transition group-hover:scale-110" />
            <p className="mt-3 font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{text}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  { Icon: PlugZap, title: "Connect devices", text: "Fit trackers, meters or sensors, or connect the controllers you already have." },
  { Icon: ServerCog, title: "Register them", text: "Add each device once with its site, model and ID." },
  { Icon: Bell, title: "Set your limits", text: "Choose the warning and critical levels that matter to you." },
  { Icon: RadioTower, title: "Watch it live", text: "Dashboards, alarms and reports start working straight away." },
];

function Rollout() {
  return (
    <Section eyebrow="Getting started" title="From devices to dashboards in four steps">
      <ol className="relative grid gap-6 md:grid-cols-4">
        <div className="absolute left-5 right-5 top-5 hidden h-px bg-gradient-to-r from-teal-400/60 via-teal-400/30 to-teal-400/10 md:block" />
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="relative flex gap-4 md:flex-col"
          >
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-300/60 bg-[#050914] text-teal-200">
              <s.Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-white">
                <span className="mr-1 text-teal-300">{i + 1}.</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-slate-400">{s.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}

export function GsnEdgeDemo({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="text-slate-100">
      <ProductHero
        badge={
          <>
            <RadioTower className="h-3.5 w-3.5" /> IoT monitoring platform
          </>
        }
        title={
          <>
            GSN <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Edge</span>
          </>
        }
        text="One dashboard for everything you need to keep an eye on. Machines in the toolroom, lifts in your buildings, vans on the road and meters on the wall all report in live, with alarms the moment something goes wrong."
        actions={
          <>
            <button onClick={() => scrollToId("cases")} className={primaryBtn}>
              See it in action <ArrowDown className="h-4 w-4" />
            </button>
            <Link to="/" className={secondaryBtn}>
              Request a demo <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        layout="stacked"
        visual={<ConnectFlow />}
        benefits={BENEFITS}
      />
      <Section
        id="cases"
        eyebrow="Case studies"
        title={
          <>
            One platform, <span className="text-teal-300">four very different jobs.</span>
          </>
        }
        subtitle="Pick an industry to see the problem it solves and the GSN Edge screen they use, running live."
      >
        <CaseStudies />
      </Section>
      <Features />
      <Rollout />
      <ClosingCta
        title="See your own assets live"
        text="Tell us what you want to monitor: machines, lifts, vehicles, energy or something else. We'll show you how it would look in GSN Edge."
        actions={
          <>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:-translate-y-0.5">
              Request a demo <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => navigate("/showcase/vision")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Explore our Vision projects
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-slate-300 transition hover:text-white">
              Back to IoT
            </button>
          </>
        }
      />
    </div>
  );
}
