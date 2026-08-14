export const GUEST_DAILY_IMAGE_LIMIT = 1;
export const FREE_USER_DAILY_IMAGE_LIMIT = 10;

export function currentUsageDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
