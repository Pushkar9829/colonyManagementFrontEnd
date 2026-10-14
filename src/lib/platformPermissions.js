// Platform console permissions. The server sends `platformPermissions` (an array of keys such as
// 'societies.suspend') on the signed-in user for platform team members, and null for everyone else.
// The server checks every action again; this only decides what to show.

export const isPlatformMember = (user) => Array.isArray(user?.platformPermissions);

export const can = (user, permission) => isPlatformMember(user) && (!permission || user.platformPermissions.includes(permission));

export const canAny = (user, ...permissions) => permissions.some((p) => can(user, p));

// A checker bound to one user, for navFor(role, isEnabled, check) and components.
export const permissionChecker = (user) => (permission) => can(user, permission);
