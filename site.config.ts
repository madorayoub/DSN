// Centralized canonical base URL used by both static + app sitemap
export const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://directsales.network';

export const PHONE_NUMBER = '+15615567182';
export const CONTACT_EMAIL = 'contact@directsales.network';
export const OFFICE_ADDRESS = {
  street: '250 International Pkwy Suite 134',
  city: 'Lake Mary',
  state: 'FL',
  zip: '32746',
  full: '250 International Pkwy Suite 134, Lake Mary, FL 32746'
};
