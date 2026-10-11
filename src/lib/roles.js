export const ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  FACILITY_MANAGER: 'facility_manager',
  GUARD: 'guard',
  RESIDENT: 'resident',
  STAFF: 'staff',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  accountant: 'Accountant',
  facility_manager: 'Facility Manager',
  guard: 'Security Guard',
  resident: 'Resident',
  staff: 'Staff',
  super_admin: 'Super Admin',
};

// Admin implicitly has every permission, mirroring the backend authorize() middleware.
export const hasRole = (user, ...roles) => Boolean(user) && (user.role === ROLES.ADMIN || roles.includes(user.role));
export const isManager = (user) => hasRole(user, ROLES.FACILITY_MANAGER);
export const isFinance = (user) => hasRole(user, ROLES.ACCOUNTANT);
