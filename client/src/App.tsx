import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { SubscriptionGate } from "./components/SubscriptionGate";

// ── Eager imports (critical path — needed on first paint) ──────────────────
import Home from "./pages/Home";
import AskAI from "./components/AskAI";

// ── Lazy imports (loaded on demand — reduces initial bundle by ~60%) ────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Staff = lazy(() => import("./pages/Staff"));
const StaffDetail = lazy(() => import("./pages/StaffDetail"));
const Credentials = lazy(() => import("./pages/Credentials"));
const PendingReview = lazy(() => import("./pages/PendingReview"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Settings = lazy(() => import("./pages/Settings"));
const StaffImport = lazy(() => import("./pages/StaffImport"));
const CredentialImport = lazy(() => import("./pages/CredentialImport"));
const ImportHistory = lazy(() => import("./pages/ImportHistory"));
const VerificationCheck = lazy(() => import("./pages/VerificationCheck"));
const VerificationChecks = lazy(() => import("./pages/VerificationChecks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const About = lazy(() => import("./pages/About"));
const ProviderCredentialing = lazy(() => import("./pages/ProviderCredentialing"));
const Security = lazy(() => import("./pages/Security"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FAQ = lazy(() => import("./pages/FAQ"));
const BehavioralHealthCredentials = lazy(() => import("./pages/BehavioralHealthCredentials"));
const ProviderDetail = lazy(() => import("./pages/ProviderDetail"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AgencyAlreadyRegistered = lazy(() => import("./pages/AgencyAlreadyRegistered"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingCancel = lazy(() => import("./pages/BillingCancel"));
const Billing = lazy(() => import("./pages/Billing"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminSales = lazy(() => import("./pages/AdminSales"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications"));
const AdminContactInbox = lazy(() => import("./pages/AdminContactInbox"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const AdminScheduledJobs = lazy(() => import("./pages/AdminScheduledJobs"));
const AdminDeletionQueue = lazy(() => import("./pages/AdminDeletionQueue"));
const BusinessCard = lazy(() => import("./pages/BusinessCard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Reports = lazy(() => import("./pages/Reports"));
const Notes = lazy(() => import("./pages/Notes"));
const BacbCredentials = lazy(() => import("./pages/BacbCredentials"));
const SupervisionRatios = lazy(() => import("./pages/SupervisionRatios"));
const OigExclusionChecks = lazy(() => import("./pages/OigExclusionChecks"));
const OnboardingChecklist = lazy(() => import("./pages/OnboardingChecklist"));

// ── Page-level loading skeleton ────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FDFAF6",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: "3px solid #E2D9CE",
          borderTopColor: "#1D3D2F",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "#A89880" }}>Loading…</span>
      </div>
    </div>
  );
}

/** Fetches live dashboard stats and passes them as context to AskAI */
function AskAIWithContext() {
  const { isAuthenticated, user } = useAuth();
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const completeTourMutation = trpc.auth.completeTour.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  // Onboarding mode: show AI guide for users who haven't completed the tour
  const tourCompleted = (user as any)?.tourCompleted === true;
  const onboardingMode = isAuthenticated && !tourCompleted;

  const handleOnboardingEngaged = () => {
    if (!tourCompleted) {
      completeTourMutation.mutate();
    }
  };

  return (
    <AskAI
      context={stats ? {
        totalStaff: Number(stats.totalStaff) || 0,
        totalCredentials: Number(stats.totalCredentials) || 0,
        expiringSoon: Number(stats.expiringSoon) || 0,
        expired: Number(stats.expired) || 0,
      } : undefined}
      onboardingMode={onboardingMode}
      onOnboardingEngaged={handleOnboardingEngaged}
    />
  );
}

function Router() {
  const [location] = useLocation();
  // Show Ask AI only on authenticated app pages (not on public marketing pages or 404)
  const PUBLIC_PAGES = ["/", "/pricing", "/features", "/about", "/privacy", "/security", "/terms", "/refunds", "/verify-email", "/billing/success", "/billing/cancel", "/agency-already-registered", "/404", "/how-it-works", "/faq", "/behavioral-health-credentials", "/card"];
  const showAskAI = !PUBLIC_PAGES.includes(location) && !location.startsWith("/admin");

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* ── Public routes (no subscription gating) ──────────────────── */}
          <Route path={"/"} component={Home} />
          <Route path={"/pricing"} component={Pricing} />
          <Route path={"/features"} component={Features} />
          <Route path={"/about"} component={About} />
          <Route path={"/privacy"} component={PrivacyPolicy} />
          <Route path={"/security"} component={Security} />
          <Route path={"/terms"} component={TermsOfService} />
          <Route path={"/refunds"} component={RefundPolicy} />
          <Route path={"/verify-email"} component={VerifyEmail} />
          <Route path={"/billing/success"} component={BillingSuccess} />
          <Route path={"/billing/cancel"} component={BillingCancel} />
          <Route path={"/agency-already-registered"} component={AgencyAlreadyRegistered} />
          <Route path={"/card"} component={BusinessCard} />
          <Route path={"/how-it-works"} component={HowItWorks} />
          <Route path={"/faq"} component={FAQ} />
          <Route path={"/behavioral-health-credentials"} component={BehavioralHealthCredentials} />

          {/* ── Subscription-gated routes ────────────────────────────────── */}
          <Route path={"/dashboard"}>
            <SubscriptionGate><Dashboard /></SubscriptionGate>
          </Route>
          <Route path={"/staff/import"}>
            <SubscriptionGate><StaffImport /></SubscriptionGate>
          </Route>
          <Route path={"/staff/:id/verify"}>
            <SubscriptionGate><VerificationCheck /></SubscriptionGate>
          </Route>
          <Route path={"/staff/:id"}>
            <SubscriptionGate><StaffDetail /></SubscriptionGate>
          </Route>
          <Route path={"/staff"}>
            <SubscriptionGate><Staff /></SubscriptionGate>
          </Route>
          <Route path={"/credentialing/:id"}>
            <SubscriptionGate><ProviderDetail /></SubscriptionGate>
          </Route>
          <Route path={"/credentialing"}>
            <SubscriptionGate><ProviderCredentialing /></SubscriptionGate>
          </Route>
          <Route path={"/credentials/import"}>
            <SubscriptionGate><CredentialImport /></SubscriptionGate>
          </Route>
          <Route path={"/credentials"}>
            <SubscriptionGate><Credentials /></SubscriptionGate>
          </Route>
          <Route path={"/imports"}>
            <SubscriptionGate><ImportHistory /></SubscriptionGate>
          </Route>
          <Route path={"/pending-review"}>
            <SubscriptionGate><PendingReview /></SubscriptionGate>
          </Route>
          <Route path={"/verification-checks"}>
            <SubscriptionGate><VerificationChecks /></SubscriptionGate>
          </Route>
          <Route path={"/settings"}>
            <SubscriptionGate><Settings /></SubscriptionGate>
          </Route>
          <Route path={"/billing"}>
            <SubscriptionGate><Billing /></SubscriptionGate>
          </Route>
          <Route path={"/reports"}>
            <SubscriptionGate><Reports /></SubscriptionGate>
          </Route>
          <Route path={"/admin/leads"}>
            <SubscriptionGate><AdminLeads /></SubscriptionGate>
          </Route>
          <Route path={"/admin/sales"}>
            <SubscriptionGate><AdminSales /></SubscriptionGate>
          </Route>
          <Route path={"/admin/notifications"}>
            <SubscriptionGate><AdminNotifications /></SubscriptionGate>
          </Route>
          <Route path={"/admin/contact"}>
            <SubscriptionGate><AdminContactInbox /></SubscriptionGate>
          </Route>
          <Route path={"/admin/audit-log"}>
            <SubscriptionGate><AdminAuditLog /></SubscriptionGate>
          </Route>
          <Route path={"/admin/scheduled-jobs"}>
            <AdminScheduledJobs />
          </Route>
          <Route path={"/admin/deletions"}>
            <AdminDeletionQueue />
          </Route>
          <Route path={"/onboarding"}>
            <SubscriptionGate><Onboarding /></SubscriptionGate>
          </Route>
          <Route path={"/notes"}>
            <SubscriptionGate><Notes /></SubscriptionGate>
          </Route>
          <Route path={"/bacb"}>
            <SubscriptionGate><BacbCredentials /></SubscriptionGate>
          </Route>
          <Route path={"/supervision"}>
            <SubscriptionGate><SupervisionRatios /></SubscriptionGate>
          </Route>
          <Route path={"/oig"}>
            <SubscriptionGate><OigExclusionChecks /></SubscriptionGate>
          </Route>
          <Route path={"/onboarding-checklist"}>
            <SubscriptionGate><OnboardingChecklist /></SubscriptionGate>
          </Route>

          {/* ── Fallback ─────────────────────────────────────────────────── */}
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {showAskAI && <AskAIWithContext />}
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
