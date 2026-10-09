export const ADMIN_PAGE_SIZE = 50;

export function adminPage(value?: string) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}
