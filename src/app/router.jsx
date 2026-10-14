import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GuestOnly, RequireAuth, RequirePlatform, RequireRole } from '../components/layout/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui';

// Route-level code splitting: each page loads on first visit.
const page = (load) => {
  const Component = lazy(load);
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
};

const A = 'admin';
const ACC = 'accountant';
const FM = 'facility_manager';
const G = 'guard';
const R = 'resident';
const S = 'staff';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="mt-2 text-slate-600">This page does not exist.</p>
      <Link to="/" className="mt-4 font-medium text-brand-600 hover:underline">Go home</Link>
    </div>
  );
}

const guarded = (roles, children) => ({ element: <RequireRole roles={roles} />, children });

const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const PlatformOverviewPage = lazy(() => import('../features/platform/pages/PlatformOverviewPage'));

// "/" is the society dashboard, or the platform overview when no society is open.
function Home() {
  const { user } = useAuth();
  return <Suspense fallback={<PageLoader />}>{user.society ? <DashboardPage /> : <PlatformOverviewPage />}</Suspense>;
}

export const router = createBrowserRouter([
  // Pay link from invoice/reminder emails. Public on purpose: members of a suspended society can't open the app,
  // and the token only allows paying that one invoice.
  {
    element: <AuthLayout />,
    children: [{ path: '/subscription/pay/:token', element: page(() => import('../features/subscriptions/pages/PayInvoicePage')) }],
  },
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: page(() => import('../features/auth/pages/LoginPage')) },
          { path: '/register', element: page(() => import('../features/auth/pages/RegisterSocietyPage')) },
          { path: '/join', element: page(() => import('../features/auth/pages/JoinSocietyPage')) },
          { path: '/forgot-password', element: page(() => import('../features/auth/pages/ForgotPasswordPage')) },
          { path: '/reset-password', element: page(() => import('../features/auth/pages/ResetPasswordPage')) },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      // Society policy requires two-step verification for this role: set it up before using the app.
      { element: <AuthLayout />, children: [{ path: 'setup-two-step', element: page(() => import('../features/profile/pages/MfaSetupRequiredPage')) }] },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Home /> },
          { element: <RequirePlatform />, children: [{ path: 'platform/societies', element: page(() => import('../features/platform/pages/PlatformSocietiesPage')) }] },
          { path: 'profile', element: page(() => import('../features/profile/pages/ProfilePage')) },
          { path: 'notices', element: page(() => import('../features/notices/pages/NoticesPage')) },
          { path: 'polls', element: page(() => import('../features/polls/pages/PollsPage')) },
          guarded([G], [{ path: 'gate', element: page(() => import('../features/gate/pages/GateConsolePage')) }]),
          guarded([FM, G, R], [
            { path: 'visitors', element: page(() => import('../features/visitors/pages/VisitorsPage')) },
            { path: 'daily-help', element: page(() => import('../features/dailyHelp/pages/DailyHelpPage')) },
            { path: 'sos', element: page(() => import('../features/sos/pages/SosPage')) },
          ]),
          guarded([ACC, R], [{ path: 'billing', element: page(() => import('../features/billing/pages/BillingPage')) }]),
          guarded([FM, R, S], [
            { path: 'complaints', element: page(() => import('../features/complaints/pages/ComplaintsPage')) },
            { path: 'complaints/:id', element: page(() => import('../features/complaints/pages/ComplaintDetailPage')) },
          ]),
          guarded([FM, R], [{ path: 'amenities', element: page(() => import('../features/amenities/pages/AmenitiesPage')) }]),
          guarded([R], [{ path: 'vehicles', element: page(() => import('../features/vehicles/pages/VehiclesPage')) }]),
          guarded([A], [
            { path: 'units', element: page(() => import('../features/units/pages/UnitsPage')) },
            { path: 'members', element: page(() => import('../features/members/pages/MembersPage')) },
            { path: 'audit', element: page(() => import('../features/audit/pages/AuditPage')) },
            { path: 'settings', element: page(() => import('../features/settings/pages/SettingsPage')) },
          ]),
          guarded([A], [{ path: 'devices', element: page(() => import('../features/devices/pages/DevicesPage')) }]),
          // ---- feature module routes (add below this line; use guarded([roles], [...]) and page(() => import(...))) ----
          guarded([FM], [{ path: 'gates', element: page(() => import('../features/gates/pages/GatesPage')) }]),
          {
            element: <RequirePlatform />,
            children: [
              { path: 'platform/team', element: page(() => import('../features/platform/pages/PlatformTeamPage')) },
              { path: 'platform/roles', element: page(() => import('../features/platform/pages/PlatformRolesPage')) },
              { path: 'platform/activity', element: page(() => import('../features/platform/pages/PlatformActivityPage')) },
            ],
          },
          guarded([ACC, FM, R], [
            { path: 'lucky-draws', element: page(() => import('../features/luckyDraw/pages/LuckyDrawsPage')) },
            { path: 'lucky-draws/:id', element: page(() => import('../features/luckyDraw/pages/LuckyDrawDetailPage')) },
          ]),
          { element: <RequirePlatform />, children: [{ path: 'platform/lucky-draws', element: page(() => import('../features/luckyDraw/pages/PlatformLuckyDrawsPage')) }] },
          guarded([A], [{ path: 'privacy/requests', element: page(() => import('../features/privacy/pages/DeletionRequestsPage')) }]),
          { element: <RequirePlatform />, children: [{ path: 'platform/privacy', element: page(() => import('../features/privacy/pages/DeletionRequestsPage')) }] },
          guarded([FM, S], [
            { path: 'assets', element: page(() => import('../features/assets/pages/AssetsPage')) },
            { path: 'assets/scan', element: page(() => import('../features/assets/pages/AssetScanPage')) },
            { path: 'assets/code/:code', element: page(() => import('../features/assets/pages/AssetByCodePage')) },
            { path: 'assets/:id', element: page(() => import('../features/assets/pages/AssetDetailPage')) },
            { path: 'fire-safety', element: page(() => import('../features/assets/pages/FireSafetyPage')) },
            { path: 'work-orders', element: page(() => import('../features/maintenance/pages/WorkOrdersPage')) },
            { path: 'inventory', element: page(() => import('../features/inventory/pages/InventoryPage')) },
          ]),
          guarded([FM], [
            { path: 'maintenance', element: page(() => import('../features/maintenance/pages/MaintenancePage')) },
            { path: 'checklists', element: page(() => import('../features/maintenance/pages/ChecklistsPage')) },
            { path: 'staff/leave', element: page(() => import('../features/staffhr/pages/LeavePage')) },
          ]),
          guarded([FM, S, G], [{ path: 'utility-logs', element: page(() => import('../features/utilityLogs/pages/UtilityLogsPage')) }]),
          guarded([FM, ACC], [
            { path: 'staff/employees', element: page(() => import('../features/staffhr/pages/EmployeesPage')) },
            { path: 'staff/attendance', element: page(() => import('../features/staffhr/pages/AttendancePage')) },
            { path: 'staff/payroll', element: page(() => import('../features/staffhr/pages/PayrollPage')) },
          ]),
          guarded([FM, ACC, S, G], [{ path: 'my-work', element: page(() => import('../features/staffhr/pages/MyWorkPage')) }]),
          guarded([R], [{ path: 'household', element: page(() => import('../features/household/pages/MyHouseholdPage')) }]),
          guarded([G, FM], [
            { path: 'emergency-info', element: page(() => import('../features/household/pages/EmergencyInfoPage')) },
            { path: 'amenity-pass-check', element: page(() => import('../features/amenities/pages/PassCheckPage')) },
          ]),
          guarded([FM], [
            { path: 'households', element: page(() => import('../features/household/pages/HouseholdsPage')) },
            { path: 'tenancies', element: page(() => import('../features/tenancy/pages/TenanciesPage')) },
            { path: 'amenities/reports', element: page(() => import('../features/amenities/pages/AmenityReportsPage')) },
            { path: 'amenities/passes', element: page(() => import('../features/amenities/pages/PassesAdminPage')) },
            { path: 'complaints/settings', element: page(() => import('../features/complaints/pages/HelpdeskSettingsPage')) },
            { path: 'complaints/performance', element: page(() => import('../features/complaints/pages/StaffPerformancePage')) },
          ]),
          guarded([A], [{ path: 'kyc', element: page(() => import('../features/kyc/pages/KycQueuePage')) }]),
          { path: 'emergency', element: page(() => import('../features/emergency/pages/EmergencyDirectoryPage')) },
          guarded([FM, G, R], [
            { path: 'parcels', element: page(() => import('../features/parcels/pages/ParcelsPage')) },
            { path: 'parking', element: page(() => import('../features/parking/pages/ParkingPage')) },
            { path: 'child-safety', element: page(() => import('../features/emergency/pages/ChildSafetyPage')) },
          ]),
          guarded([FM, G], [
            { path: 'security/watchlist', element: page(() => import('../features/visitors/pages/WatchlistPage')) },
            { path: 'vehicle-movements', element: page(() => import('../features/gate/pages/VehicleMovementsPage')) },
            { path: 'patrols', element: page(() => import('../features/patrols/pages/PatrolsPage')) },
            { path: 'duty', element: page(() => import('../features/duty/pages/DutyPage')) },
          ]),
          guarded([FM], [{ path: 'visitors/analytics', element: page(() => import('../features/visitors/pages/VisitorAnalyticsPage')) }]),
          guarded([ACC], [
            { path: 'accounting', element: page(() => import('../features/accounting/pages/AccountsPage')) },
            { path: 'accounting/reports', element: page(() => import('../features/accounting/pages/ReportsPage')) },
            { path: 'accounting/bank', element: page(() => import('../features/accounting/pages/BankReconciliationPage')) },
            { path: 'accounting/budget', element: page(() => import('../features/accounting/pages/BudgetPage')) },
            { path: 'expenses/bills', element: page(() => import('../features/expenses/pages/VendorBillsPage')) },
            { path: 'expenses/payments', element: page(() => import('../features/expenses/pages/VendorPaymentsPage')) },
          ]),
          guarded([ACC, FM], [
            { path: 'expenses/vendors', element: page(() => import('../features/expenses/pages/VendorsPage')) },
            { path: 'expenses/purchase-requests', element: page(() => import('../features/expenses/pages/PurchaseRequestsPage')) },
          ]),
          guarded([ACC, FM, R], [
            { path: 'committee', element: page(() => import('../features/committee/pages/CommitteePage')) },
            { path: 'meetings', element: page(() => import('../features/meetings/pages/MeetingsPage')) },
            { path: 'meetings/:id', element: page(() => import('../features/meetings/pages/MeetingDetailPage')) },
          ]),
          guarded([R], [
            { path: 'elections', element: page(() => import('../features/elections/pages/ElectionsPage')) },
            { path: 'elections/:id', element: page(() => import('../features/elections/pages/ElectionDetailPage')) },
          ]),
          guarded([ACC, R], [{ path: 'registers', element: page(() => import('../features/registers/pages/RegistersPage')) }]),
          guarded([ACC, FM, G, R, S], [
            { path: 'documents', element: page(() => import('../features/documents/pages/DocumentsPage')) },
            { path: 'documents/:id', element: page(() => import('../features/documents/pages/DocumentsPage')) },
          ]),
          guarded([G, R], [
            { path: 'requests', element: page(() => import('../features/requests/pages/RequestsPage')) },
            { path: 'requests/:id', element: page(() => import('../features/requests/pages/RequestDetailPage')) },
          ]),
          { path: 'events', element: page(() => import('../features/events/pages/EventsPage')) },
          { path: 'events/:id', element: page(() => import('../features/events/pages/EventDetailPage')) },
          { path: 'messages', element: page(() => import('../features/chat/pages/MessagesPage')) },
          { path: 'messages/:id', element: page(() => import('../features/chat/pages/MessagesPage')) },
          guarded([FM, ACC, R], [
            { path: 'forum', element: page(() => import('../features/forum/pages/ForumPage')) },
            { path: 'forum/:id', element: page(() => import('../features/forum/pages/TopicPage')) },
            { path: 'directory', element: page(() => import('../features/directory/pages/DirectoryPage')) },
            { path: 'lost-found', element: page(() => import('../features/lostFound/pages/LostFoundPage')) },
            { path: 'marketplace', element: page(() => import('../features/marketplace/pages/MarketplacePage')) },
          ]),
          {
            element: <RequirePlatform />,
            children: [
              { path: 'platform/plans', element: page(() => import('../features/platform/pages/PlatformPlansPage')) },
              { path: 'platform/invoices', element: page(() => import('../features/platform/pages/PlatformInvoicesPage')) },
              { path: 'platform/support', element: page(() => import('../features/support/pages/PlatformSupportPage')) },
            ],
          },
          guarded([ACC], [{ path: 'subscription', element: page(() => import('../features/subscriptions/pages/SubscriptionPage')) }]),
          guarded([FM, ACC], [{ path: 'support', element: page(() => import('../features/support/pages/SupportPage')) }]),
          guarded([FM], [{ path: 'portfolio', element: page(() => import('../features/portfolio/pages/PortfolioPage')) }]),
          guarded([ACC, FM], [
            { path: 'reports', element: page(() => import('../features/reports/pages/ReportsPage')) },
            { path: 'insights', element: page(() => import('../features/insights/pages/InsightsPage')) },
          ]),
          guarded([A], [{ path: 'reports/schedules', element: page(() => import('../features/reports/pages/ScheduledReportsPage')) }]),
          guarded([R], [{ path: 'builder', element: page(() => import('../features/builder/pages/BuilderPage')) }]),
          guarded([ACC], [{ path: 'finance/settings', element: page(() => import('../features/billing/pages/FinanceSettingsPage')) }]),
          guarded([ACC, FM, R], [{ path: 'meters', element: page(() => import('../features/meters/pages/MetersPage')) }]),
          guarded([A], [{ path: 'import', element: page(() => import('../features/imports/pages/ImportPage')) }]),

          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

