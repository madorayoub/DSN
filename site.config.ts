// Centralized canonical base URL used by both static + app sitemap
export const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://directsales.network';
