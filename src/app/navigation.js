import {
  LayoutDashboard,
  Building2,
  Users,
  DoorOpen,
  ShieldCheck,
  UserCheck,
  Siren,
  Receipt,
  Wrench,
  Megaphone,
  Vote,
  CalendarDays,
  Car,
  Settings,
  ScrollText,
  LayoutGrid,
  Building,
  KeyRound,
} from 'lucide-react';
import { Tags as PlansIcon, FileText as PlatformInvoicesIcon, Headset as PlatformSupportIcon, CreditCard as SubscriptionIcon, LifeBuoy as SupportIcon, FileBarChart2 as ReportsIcon, MailCheck as ScheduledReportsIcon, HardHat as BuilderIcon, Lightbulb as InsightsIcon, Briefcase as PortfolioIcon } from 'lucide-react';
import { FileSpreadsheet } from 'lucide-react';
import { Package as ParcelsIcon, ShieldBan as WatchlistIcon, CarFront as MovementsIcon, SquareParking as ParkingIcon, ChartColumn as VisitorAnalyticsIcon, PhoneCall as EmergencyIcon, Baby as ChildSafetyIcon, Route as PatrolsIcon, NotebookPen as DutyIcon } from 'lucide-react';
import { Gauge, SlidersHorizontal } from 'lucide-react';
import { CalendarHeart as EventsIcon, MessagesSquare as ForumIcon, BookUser as DirectoryIcon, PackageSearch as LostFoundIcon, Store as MarketplaceIcon, MessageCircle as MessagesIcon } from 'lucide-react';
import { Landmark as CommitteeIcon, Presentation as MeetingsIcon, BookOpenCheck as RegistersIcon, FolderOpen as DocumentsIcon, FileSignature as RequestsIcon, CheckSquare as ElectionsIcon } from 'lucide-react';
import { BookOpen as AccountsIcon, BarChart3 as FinanceReportsIcon, Landmark as BankRecIcon, PiggyBank as BudgetIcon, Store as VendorsIcon, ClipboardList as PurchaseRequestsIcon, FileText as VendorBillsIcon, HandCoins as VendorPaymentsIcon } from 'lucide-react';
import { House as MyHouseholdIcon, HeartPulse as EmergencyInfoIcon, ScanLine as PassCheckIcon, HousePlus as HouseholdsIcon, FileKey as TenanciesIcon, IdCard as KycIcon, Settings2 as HelpdeskSettingsIcon, TrendingUp as StaffPerformanceIcon, ChartColumn as AmenityReportsIcon, Ticket as AmenityPassesIcon } from 'lucide-react';
import { UserX as DeletionRequestsIcon } from 'lucide-react';
import { Boxes as AssetsIcon, CalendarClock as PpmIcon, Warehouse as InventoryIcon, Activity as UtilityLogsIcon, ClipboardCheck as ChecklistsIcon, FlameKindling as FireSafetyIcon, Hammer as WorkOrdersIcon, Contact as EmployeesIcon, CalendarRange as RosterIcon, Plane as LeaveIcon, Banknote as PayrollIcon, BriefcaseBusiness as MyWorkIcon } from 'lucide-react';

export const A = 'admin';
export const ACC = 'accountant';
export const FM = 'facility_manager';
export const G = 'guard';
export const R = 'resident';
export const S = 'staff';
export const SA = 'super_admin';
export const EVERYONE = [A, ACC, FM, G, R, S];

// Sidebar sections, in display order. Items without a section sit at the top.
export const SECTIONS = ['Security', 'Residents', 'Finance', 'Helpdesk', 'Facility', 'Staff & HR', 'Amenities', 'Community', 'Governance', 'Reports', 'Settings', 'Platform'];

// Residents, guards and staff get a shorter menu built around their daily jobs: the main items sit at the
// top, a few named groups follow and everything else they may open goes under "More".
export const ROLE_SECTIONS = ['My home', 'Society', 'Safety', 'More'];
const ROLE_LAYOUTS = {
  resident: {
    top: ['/', '/billing', '/visitors', '/complaints', '/amenities'],
    groups: [
      ['My home', ['/household', '/vehicles', '/daily-help', '/parcels', '/parking', '/meters']],
      ['Society', ['/notices', '/polls', '/elections', '/events', '/messages', '/directory']],
      ['Safety', ['/emergency', '/child-safety', '/sos']],
    ],
  },
  guard: {
    top: ['/', '/gate', '/parcels', '/patrols', '/sos', '/security/watchlist', '/duty', '/my-work'],
    groups: [],
    hide: ['/polls', '/events', '/documents'],
  },
  staff: {
    top: ['/', '/my-work', '/complaints', '/work-orders', '/assets', '/notices', '/emergency'],
    groups: [],
    hide: ['/polls', '/events', '/documents'],
  },
};

// Phone bottom bar: four shortcuts per role (a fifth button opens the full menu).
export const BOTTOM_BAR = {
  resident: ['/', '/billing', '/visitors', '/complaints'],
  guard: ['/', '/gate', '/parcels', '/sos'],
  staff: ['/', '/my-work', '/complaints', '/notices'],
  admin: ['/', '/billing', '/complaints', '/visitors'],
  accountant: ['/', '/billing', '/accounting', '/expenses/bills'],
  facility_manager: ['/', '/complaints', '/work-orders', '/my-work'],
};

// roles: who sees the item. Kept in sync with backend route authorization.
// section: one of SECTIONS (or omitted for top-level items).
export const NAV_ITEMS = [
  { to: '/', label: 'Platform overview', icon: LayoutGrid, roles: [SA], end: true },
  { to: '/platform/societies', label: 'Societies', icon: Building, roles: [SA], section: 'Platform' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: EVERYONE, end: true },

  { to: '/gate', label: 'Gate console', icon: ShieldCheck, roles: [A, G], section: 'Security' },
  { to: '/visitors', label: 'Visitors', icon: DoorOpen, roles: [A, FM, G, R], section: 'Security', end: true },
  { to: '/daily-help', label: 'Daily help', icon: UserCheck, roles: [A, FM, G, R], section: 'Security' },
  { to: '/sos', label: 'SOS alerts', icon: Siren, roles: [A, FM, G, R], section: 'Security' },
  { to: '/vehicles', label: 'My vehicles', icon: Car, roles: [R], section: 'Security' },

  { to: '/billing', label: 'Billing', labels: { resident: 'My bills' }, icon: Receipt, roles: [A, ACC, R], section: 'Finance' },

  { to: '/complaints', label: 'Complaints', icon: Wrench, roles: [A, FM, R, S], section: 'Helpdesk' },
  { to: '/amenities', label: 'Amenities', icon: CalendarDays, roles: [A, FM, R], section: 'Amenities' },

  { to: '/notices', label: 'Notices', icon: Megaphone, roles: EVERYONE, section: 'Community' },
  { to: '/polls', label: 'Polls', icon: Vote, roles: EVERYONE, section: 'Community' },

  { to: '/units', label: 'Units', icon: Building2, roles: [A], section: 'Residents' },
  { to: '/members', label: 'Members', icon: Users, roles: [A], section: 'Residents' },
  { to: '/devices', label: 'Devices & API keys', icon: KeyRound, roles: [A], section: 'Settings' },
  { to: '/audit', label: 'Audit log', icon: ScrollText, roles: [A], section: 'Settings' },
  { to: '/settings', label: 'Society settings', icon: Settings, roles: [A], section: 'Settings' },

  // ---- feature module nav items (add below this line; keep the section field) ----
  { to: '/privacy/requests', label: 'Account deletion', icon: DeletionRequestsIcon, roles: [A], section: 'Settings' },
  { to: '/platform/privacy', label: 'Account deletion', icon: DeletionRequestsIcon, roles: [SA], section: 'Platform' },
  { to: '/my-work', label: 'My work', icon: MyWorkIcon, roles: [FM, ACC, S, G] },
  { to: '/assets', label: 'Assets', icon: AssetsIcon, roles: [A, FM, S], section: 'Facility' },
  { to: '/maintenance', label: 'Repair schedule (AMC/PPM)', icon: PpmIcon, roles: [A, FM], section: 'Facility' },
  { to: '/inventory', label: 'Inventory', icon: InventoryIcon, roles: [A, FM, S], section: 'Facility' },
  { to: '/utility-logs', label: 'Utility logs', icon: UtilityLogsIcon, roles: [A, FM, S, G], section: 'Facility' },
  { to: '/checklists', label: 'Checklists', icon: ChecklistsIcon, roles: [A, FM], section: 'Facility' },
  { to: '/fire-safety', label: 'Fire safety', icon: FireSafetyIcon, roles: [A, FM, S], section: 'Facility' },
  { to: '/work-orders', label: 'Work orders', icon: WorkOrdersIcon, roles: [A, FM, S], section: 'Facility' },
  { to: '/staff/employees', label: 'Employees', icon: EmployeesIcon, roles: [A, FM, ACC], section: 'Staff & HR' },
  { to: '/staff/attendance', label: 'Roster & attendance', icon: RosterIcon, roles: [A, FM, ACC], section: 'Staff & HR' },
  { to: '/staff/leave', label: 'Leave', icon: LeaveIcon, roles: [A, FM], section: 'Staff & HR' },
  { to: '/staff/payroll', label: 'Payroll', icon: PayrollIcon, roles: [A, FM, ACC], section: 'Staff & HR' },
  { to: '/household', label: 'My household', icon: MyHouseholdIcon, roles: [R] },
  { to: '/emergency-info', label: 'Emergency info', icon: EmergencyInfoIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/amenity-pass-check', label: 'Pass check', icon: PassCheckIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/households', label: 'Households', icon: HouseholdsIcon, roles: [A, FM], section: 'Residents' },
  { to: '/tenancies', label: 'Tenancies', icon: TenanciesIcon, roles: [A, FM], section: 'Residents' },
  { to: '/complaints/settings', label: 'Complaint settings', icon: HelpdeskSettingsIcon, roles: [A, FM], section: 'Helpdesk' },
  { to: '/complaints/performance', label: 'Staff performance', icon: StaffPerformanceIcon, roles: [A, FM], section: 'Helpdesk' },
  { to: '/amenities/passes', label: 'Memberships & passes', icon: AmenityPassesIcon, roles: [A, FM], section: 'Amenities' },
  { to: '/amenities/reports', label: 'Amenity reports', icon: AmenityReportsIcon, roles: [A, FM], section: 'Amenities' },
  { to: '/kyc', label: 'KYC verification', icon: KycIcon, roles: [A], section: 'Residents' },
  { to: '/parcels', label: 'Parcels', icon: ParcelsIcon, roles: [A, FM, G, R], section: 'Security' },
  { to: '/parking', label: 'Parking', icon: ParkingIcon, roles: [A, FM, G, R], section: 'Security' },
  { to: '/patrols', label: 'Patrols', icon: PatrolsIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/duty', label: 'Guard duty', icon: DutyIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/vehicle-movements', label: 'Vehicle movements', icon: MovementsIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/security/watchlist', label: 'Blocklist & watchlist', icon: WatchlistIcon, roles: [A, FM, G], section: 'Security' },
  { to: '/visitors/analytics', label: 'Visitor analytics', icon: VisitorAnalyticsIcon, roles: [A, FM], section: 'Reports' },
  { to: '/child-safety', label: 'Child safety', icon: ChildSafetyIcon, roles: [A, FM, G, R], section: 'Security' },
  { to: '/emergency', label: 'Emergency contacts', icon: EmergencyIcon, roles: EVERYONE, section: 'Security' },
  { to: '/accounting', label: 'Accounts', icon: AccountsIcon, roles: [A, ACC], section: 'Finance', end: true },
  { to: '/accounting/reports', label: 'Financial reports', icon: FinanceReportsIcon, roles: [A, ACC], section: 'Finance' },
  { to: '/accounting/bank', label: 'Bank reconciliation', icon: BankRecIcon, roles: [A, ACC], section: 'Finance' },
  { to: '/accounting/budget', label: 'Budget', icon: BudgetIcon, roles: [A, ACC], section: 'Finance' },
  { to: '/expenses/vendors', label: 'Vendors', icon: VendorsIcon, roles: [A, ACC, FM], section: 'Finance' },
  { to: '/expenses/purchase-requests', label: 'Purchase requests', icon: PurchaseRequestsIcon, roles: [A, ACC, FM], section: 'Finance' },
  { to: '/expenses/bills', label: 'Vendor bills', icon: VendorBillsIcon, roles: [A, ACC], section: 'Finance' },
  { to: '/expenses/payments', label: 'Vendor payments', icon: VendorPaymentsIcon, roles: [A, ACC], section: 'Finance' },
  { to: '/committee', label: 'Committee', icon: CommitteeIcon, roles: [A, ACC, FM, R], section: 'Governance' },
  { to: '/meetings', label: 'Meetings', icon: MeetingsIcon, roles: [A, ACC, FM, R], section: 'Governance' },
  { to: '/elections', label: 'Elections & voting', icon: ElectionsIcon, roles: [A, R], section: 'Governance' },
  { to: '/registers', label: 'Registers', icon: RegistersIcon, roles: [A, ACC, R], section: 'Governance' },
  { to: '/documents', label: 'Documents', icon: DocumentsIcon, roles: EVERYONE, section: 'Governance' },
  { to: '/requests', label: 'NOC & move requests', labels: { resident: 'Letters & move requests' }, icon: RequestsIcon, roles: [A, G, R], section: 'Governance' },
  { to: '/events', label: 'Events', icon: EventsIcon, roles: EVERYONE, section: 'Community' },
  { to: '/forum', label: 'Forum', icon: ForumIcon, roles: [A, FM, ACC, R], section: 'Community' },
  { to: '/directory', label: 'Directory', icon: DirectoryIcon, roles: [A, FM, ACC, R], section: 'Residents' },
  { to: '/lost-found', label: 'Lost & found', icon: LostFoundIcon, roles: [A, FM, ACC, R], section: 'Community' },
  { to: '/marketplace', label: 'Marketplace', icon: MarketplaceIcon, roles: [A, FM, ACC, R], section: 'Community' },
  { to: '/messages', label: 'Messages', icon: MessagesIcon, roles: EVERYONE, section: 'Community' },
  { to: '/platform/plans', label: 'Plans & pricing', icon: PlansIcon, roles: [SA], section: 'Platform' },
  { to: '/platform/invoices', label: 'Platform invoices', icon: PlatformInvoicesIcon, roles: [SA], section: 'Platform' },
  { to: '/platform/support', label: 'Support tickets', icon: PlatformSupportIcon, roles: [SA], section: 'Platform' },
  { to: '/portfolio', label: 'Portfolio', icon: PortfolioIcon, roles: [A, FM], section: 'Settings' },
  { to: '/subscription', label: 'Subscription & invoices', icon: SubscriptionIcon, roles: [A, ACC], section: 'Settings' },
  { to: '/support', label: 'Support', icon: SupportIcon, roles: [A, FM, ACC], section: 'Settings' },
  { to: '/reports', label: 'Reports', icon: ReportsIcon, roles: [A, ACC, FM], section: 'Reports', end: true },
  { to: '/reports/schedules', label: 'Scheduled reports', icon: ScheduledReportsIcon, roles: [A], section: 'Reports' },
  { to: '/builder', label: 'Builder handover', icon: BuilderIcon, roles: [A], section: 'Settings' },
  { to: '/insights', label: 'Insights', icon: InsightsIcon, roles: [A, ACC, FM], section: 'Reports' },
  { to: '/meters', label: 'Utility meters', icon: Gauge, roles: [A, ACC, FM, R], section: 'Finance' },
  { to: '/finance/settings', label: 'Finance settings', icon: SlidersHorizontal, roles: [A, ACC], section: 'Finance' },
  { to: '/import', label: 'Import from Excel', icon: FileSpreadsheet, roles: [A], section: 'Settings' },
];

// Switchable modules (platform feature flags, by plan). Items under these paths hide when switched off.
const FEATURE_BY_PATH = [
  ['/parking', 'parking'],
  ['/events', 'events'],
  ['/forum', 'forum'],
  ['/marketplace', 'marketplace'],
  ['/messages', 'chat'],
  ['/elections', 'elections'],
  ['/accounting', 'accounting'],
  ['/expenses', 'expenses'],
  ['/meters', 'meters'],
  ['/assets', 'assets'],
  ['/maintenance', 'assets'],
  ['/staff/payroll', 'payroll'],
  ['/patrols', 'patrols'],
  ['/parcels', 'parcels'],
  ['/documents', 'documents'],
  ['/requests', 'requests'],
  ['/builder', 'builder'],
];
export const featureFor = (path) => FEATURE_BY_PATH.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] || null;

// isEnabled(featureKey) — omit (or pass null) to show everything the role may see.
// Labels can differ per role (`labels: { resident: 'My bills' }`).
export const navFor = (role, isEnabled) =>
  NAV_ITEMS.filter((i) => i.roles.includes(role) && (!isEnabled || !featureFor(i.to) || isEnabled(featureFor(i.to)))).map((i) => (i.labels?.[role] ? { ...i, label: i.labels[role] } : i));

// Items grouped for the sidebar: [{ section: null | 'Finance', items: [...] }]
export function navGroupsFor(role, isEnabled) {
  const items = navFor(role, isEnabled);
  const layout = ROLE_LAYOUTS[role];
  if (layout) {
    const visible = items.filter((i) => !layout.hide?.includes(i.to));
    const pick = (paths) => paths.map((p) => visible.find((i) => i.to === p)).filter(Boolean);
    const used = new Set([...layout.top, ...layout.groups.flatMap(([, paths]) => paths)]);
    return [
      { section: null, items: pick(layout.top) },
      ...layout.groups.map(([section, paths]) => ({ section, items: pick(paths) })),
      { section: 'More', items: visible.filter((i) => !used.has(i.to)) },
    ].filter((g) => g.items.length);
  }
  const groups = [{ section: null, items: items.filter((i) => !i.section) }];
  for (const section of SECTIONS) {
    const inSection = items.filter((i) => i.section === section);
    if (inSection.length) groups.push({ section, items: inSection });
  }
  return groups.filter((g) => g.items.length);
}
