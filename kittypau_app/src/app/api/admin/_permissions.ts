export type AdminRole =
  | "owner_admin"
  | "ops_admin"
  | "support_admin"
  | "readonly_admin";

export const ADMIN_ROLES: readonly AdminRole[] = [
  "owner_admin",
  "ops_admin",
  "support_admin",
  "readonly_admin",
] as const;

export function normalizeAdminRole(value: unknown): AdminRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim() as AdminRole;
  return (ADMIN_ROLES as readonly string[]).includes(normalized)
    ? normalized
    : null;
}

export type AdminPermissions = {
  can_view_finance: boolean;
  can_view_ops: boolean;
  can_view_support: boolean;
  can_run_health_check: boolean;
  can_run_test_suite: boolean;
};

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  const canViewFinance = role === "owner_admin" || role === "readonly_admin";
  const canViewOps =
    role === "owner_admin" || role === "ops_admin" || role === "readonly_admin";
  const canViewSupport =
    role === "owner_admin" ||
    role === "support_admin" ||
    role === "readonly_admin";
  const canRunHealthCheck = role === "owner_admin" || role === "ops_admin";
  const canRunTestSuite = role === "owner_admin" || role === "ops_admin";

  return {
    can_view_finance: canViewFinance,
    can_view_ops: canViewOps,
    can_view_support: canViewSupport,
    can_run_health_check: canRunHealthCheck,
    can_run_test_suite: canRunTestSuite,
  };
}
