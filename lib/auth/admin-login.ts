export const ADMIN_LOGIN_EMAIL = "admin@anna-s-dog-more.vercel.app";

export function resolveAdminLogin(identifier: string) {
  const normalized = identifier.trim();
  return normalized.toLocaleLowerCase("en-US") === "admin" ? ADMIN_LOGIN_EMAIL : normalized;
}
