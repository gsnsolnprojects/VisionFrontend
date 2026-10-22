import React, { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Public Privacy Policy (/privacy), Terms of Service (/terms), Refund & Cancellation Policy (/refunds)
 * and Contact Us (/contact) for Vision-M Studio. Plain pages so they work for visitors who aren't
 * signed in (Google sign-in and Razorpay link to them).
 */

const LAST_UPDATED = "22 October 2026";
const CONTACT = "info@gsnsoln.com";
const PHONE = "+91 77388 63939";
const ADDRESS = "2001, Plan S Business Park, MIDC Nerul, Navi Mumbai, Maharashtra 400706, India";

type Section = { heading: string; body: React.ReactNode };

const PRIVACY: Section[] = [
  {
    heading: "Who we are",
    body: (
      <p>
        Vision-M Studio (visionm.gsnsoln.in) is run by GSN Solutions. This policy explains what information we collect
        when you use it, why, and the choices you have. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    ),
  },
  {
    heading: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, phone number, company name and role. If you sign in
          with Google, we receive your name, email address and profile picture from Google.
        </li>
        <li>
          <strong>Your content:</strong> images, labels, datasets, trained models and inspection results you upload or
          create in the app.
        </li>
        <li>
          <strong>Billing:</strong> your plan and payment status. Payments are handled by Razorpay; we never see or store
          your full card or bank details.
        </li>
        <li>
          <strong>Usage and technical data:</strong> sign-in times, actions in your workspace (for example project
          created, model trained) and basic technical logs needed to run and secure the service.
        </li>
      </ul>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <ul>
        <li>To create and secure your account and let you sign in.</li>
        <li>To store your projects and run the features you use, such as training models and running inspections.</li>
        <li>To manage your plan and payments.</li>
        <li>To send account emails, such as email verification and password reset.</li>
        <li>To support you and to fix problems.</li>
      </ul>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <>
        <p>We do not sell your information. We share it only with service providers that help us run Vision-M Studio:</p>
        <ul>
          <li>Supabase (sign-in and account data)</li>
          <li>Amazon Web Services, Mumbai region (app servers and your uploaded files)</li>
          <li>MongoDB Atlas (project and model records)</li>
          <li>Razorpay (payments)</li>
          <li>Google (sign-in with Google, and the AI assistant, which receives only the question and the model figures you ask about)</li>
          <li>Our email provider (account emails)</li>
        </ul>
        <p>We may also share information if the law requires it.</p>
      </>
    ),
  },
  {
    heading: "Cookies and local storage",
    body: (
      <p>
        We use your browser&apos;s local storage to keep you signed in and to remember settings such as your last page and
        theme. We do not use advertising or tracking cookies.
      </p>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <p>
        We keep your information while your account is active. If you ask us to delete your account, we delete your
        account data and content, except records we must keep by law (for example payment records).
      </p>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        Data is sent over encrypted connections (https), and each company can only see its own projects and data. No
        system is completely secure, but we work to protect your information.
      </p>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <p>
        You can update your profile in the app. To get a copy of your data, correct it or delete your account, email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    ),
  },
  {
    heading: "Children",
    body: <p>Vision-M Studio is not meant for children under 18, and we do not knowingly collect their information.</p>,
  },
  {
    heading: "Changes",
    body: <p>If we change this policy, we will update this page and the date at the top.</p>,
  },
];

const TERMS: Section[] = [
  {
    heading: "About these terms",
    body: (
      <p>
        These terms apply when you use Vision-M Studio (visionm.gsnsoln.in), run by GSN Solutions. By creating an account
        or using the service, you agree to them.
      </p>
    ),
  },
  {
    heading: "Your account",
    body: (
      <p>
        Give accurate details, keep your password safe and tell us if you think your account has been misused. You are
        responsible for what happens under your account and your company workspace.
      </p>
    ),
  },
  {
    heading: "Plans and payments",
    body: (
      <p>
        Paid plans are billed monthly per company through Razorpay. A plan renews each month until it is cancelled; after
        cancelling, you keep access until the end of the month already paid for. Plan limits (such as projects, users and
        models) apply as shown on the Billing page. Refunds follow our{" "}
        <Link to="/refunds">Refund &amp; Cancellation Policy</Link>.
      </p>
    ),
  },
  {
    heading: "Your content",
    body: (
      <p>
        You keep ownership of the images, labels and other content you upload. You let us store and process it only to
        provide the service to you. Only upload content you have the right to use.
      </p>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <ul>
        <li>Don&apos;t upload unlawful content or content you don&apos;t have rights to.</li>
        <li>Don&apos;t try to access other companies&apos; data or break the service&apos;s security.</li>
        <li>Don&apos;t misuse the service or overload it on purpose.</li>
      </ul>
    ),
  },
  {
    heading: "Sample datasets and models",
    body: (
      <p>
        Sample datasets and base models provided by GSN Solutions are for use inside Vision-M Studio. They remain the
        property of GSN Solutions.
      </p>
    ),
  },
  {
    heading: "AI results",
    body: (
      <p>
        Model results and AI assistant answers can be wrong. Check results before relying on them for quality or safety
        decisions.
      </p>
    ),
  },
  {
    heading: "Availability and liability",
    body: (
      <p>
        We work to keep the service available but cannot promise it will always be uninterrupted or error-free. To the
        extent the law allows, GSN Solutions is not liable for indirect losses arising from the use of the service.
      </p>
    ),
  },
  {
    heading: "Ending your use",
    body: (
      <p>
        You can stop using the service and ask us to delete your account at any time. We may suspend accounts that break
        these terms.
      </p>
    ),
  },
  {
    heading: "Changes and governing law",
    body: (
      <p>
        We may update these terms and will change the date at the top when we do. These terms are governed by the laws
        of India.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    ),
  },
];

const REFUNDS: Section[] = [
  {
    heading: "Cancelling your plan",
    body: (
      <ul>
        <li>
          Paid plans renew every month. A company admin can cancel at any time from Settings → Billing in the app, or
          by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </li>
        <li>
          After you cancel, there are no further charges, and you keep access to your plan until the end of the month
          you have already paid for.
        </li>
        <li>After that, your company moves to the free level and paid features stop.</li>
      </ul>
    ),
  },
  {
    heading: "Refunds",
    body: (
      <>
        <p>
          Payments are for one month of access and are not refunded for a month that has started, including when you
          cancel part-way through the month. We do refund:
        </p>
        <ul>
          <li>a payment taken twice or charged by mistake;</li>
          <li>a charge after you had already cancelled;</li>
          <li>a month in which you could not use the service because of a fault on our side that we could not fix.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "How to ask for a refund",
    body: (
      <p>
        Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> within 7 days of the charge with your company name, the email
        you sign in with and the Razorpay payment ID (from your payment receipt). We reply within 2 working days.
      </p>
    ),
  },
  {
    heading: "When you get the money back",
    body: (
      <p>
        Approved refunds are sent through Razorpay to the same card, UPI or bank account used for the payment, within
        5–7 working days. Your bank may take a few more days to show it.
      </p>
    ),
  },
];

const ContactBody: React.FC = () => (
  <div className="space-y-8">
    <p>For help with Vision-M Studio, your account, billing or refunds, reach us here. We reply within 2 working days.</p>
    <dl className="grid gap-6 sm:grid-cols-2">
      <div>
        <dt className="text-sm text-[#6b726c]">Email</dt>
        <dd className="text-lg">
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-[#6b726c]">Phone</dt>
        <dd className="text-lg">
          <a href={`tel:${PHONE.replace(/\s/g, "")}`}>{PHONE}</a>
          <span className="block text-sm text-[#6b726c]">Monday to Saturday, 10 am – 6 pm IST</span>
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-sm text-[#6b726c]">Address</dt>
        <dd className="text-lg">
          GSN Solutions
          <br />
          {ADDRESS}
        </dd>
      </div>
    </dl>
  </div>
);

const LegalLayout: React.FC<{ title: string; sections?: Section[]; children?: React.ReactNode }> = ({
  title,
  sections = [],
  children,
}) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Vision-M Studio`;
    document.documentElement.classList.remove("dark");
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f5f5ee] text-[#171c1b]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="border-b border-[#d9ded3]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Vision-M<span className="ml-1 inline-block h-2 w-2 bg-[#88a530]" />
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/refunds" className="hover:underline">Refunds</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
            <Link to="/auth?mode=signin" className="font-semibold hover:underline">Log in</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-normal tracking-tight">{title}</h1>
        {sections.length > 0 && <p className="mt-2 text-sm text-[#6b726c]">Last updated: {LAST_UPDATED}</p>}
        <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-lg font-bold">{s.heading}</h2>
              {s.body}
            </section>
          ))}
          {children}
        </div>
      </main>
      <footer className="border-t border-[#d9ded3]">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-[#6b726c]">© 2026 GSN Solutions · Vision-M Studio</div>
      </footer>
      <style>{`.legal ul{list-style:disc;padding-left:1.25rem}.legal li{margin:.35rem 0}.legal a{text-decoration:underline}`}</style>
    </div>
  );
};

export const PrivacyPage: React.FC = () => <LegalLayout title="Privacy Policy" sections={PRIVACY} />;
export const TermsPage: React.FC = () => <LegalLayout title="Terms of Service" sections={TERMS} />;
export const RefundsPage: React.FC = () => <LegalLayout title="Refund & Cancellation Policy" sections={REFUNDS} />;
export const ContactPage: React.FC = () => (
  <LegalLayout title="Contact Us">
    <ContactBody />
  </LegalLayout>
);
