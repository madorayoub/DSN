// The booking page's timezone → one GHL will store on a contact. GHL prints a call's time
// in its texts and emails in the contact's timezone, and in the location's (New York) when
// the contact has none. The page shows times in the lead's own timezone, so until
// 2026-09-29 a Central lead who picked 2:00 PM was texted "3:00 PM".
// Lives outside netlify/functions/ so Netlify doesn't deploy it as a function.

// GHL's own list (GET /locations/{id}/timezones, 2026-09-29). A browser can report a zone
// that isn't on it, such as America/Anchorage or America/Kentucky/Louisville.
const GHL_TIMEZONES = [
  'Africa/Algiers', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Harare', 'Africa/Lagos',
  'Africa/Nairobi', 'America/Argentina/Buenos_Aires', 'America/Asuncion', 'America/Bahia_Banderas',
  'America/Belize', 'America/Bogota', 'America/Boise', 'America/Caracas', 'America/Chicago',
  'America/Chihuahua', 'America/Dawson', 'America/Denver', 'America/Detroit', 'America/Edmonton',
  'America/Glace_Bay', 'America/Godthab', 'America/Guatemala', 'America/Indiana/Indianapolis',
  'America/Juneau', 'America/Los_Angeles', 'America/Louisville', 'America/Managua',
  'America/Manaus', 'America/Mexico_City', 'America/Montevideo', 'America/New_York',
  'America/Noronha', 'America/Phoenix', 'America/Regina', 'America/Santiago',
  'America/Santo_Domingo', 'America/Sao_Paulo', 'America/St_Johns', 'America/Tijuana',
  'America/Toronto', 'Asia/Almaty', 'Asia/Amman', 'Asia/Baghdad', 'Asia/Baku', 'Asia/Bangkok',
  'Asia/Colombo', 'Asia/Dhaka', 'Asia/Dubai', 'Asia/Irkutsk', 'Asia/Jerusalem', 'Asia/Kabul',
  'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur',
  'Asia/Kuwait', 'Asia/Magadan', 'Asia/Qatar', 'Asia/Rangoon', 'Asia/Seoul', 'Asia/Shanghai',
  'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo', 'Asia/Vladivostok', 'Asia/Yakutsk',
  'Asia/Yekaterinburg', 'Atlantic/Azores', 'Atlantic/Canary', 'Atlantic/Cape_Verde',
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Canberra', 'Australia/Darwin',
  'Australia/Hobart', 'Australia/Perth', 'Australia/Sydney', 'Canada/Atlantic',
  'Canada/Newfoundland', 'Canada/Saskatchewan', 'Etc/GMT+12', 'Etc/GMT+2', 'Etc/Greenwich',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Brussels', 'Europe/Bucharest',
  'Europe/Helsinki', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow', 'Europe/Oslo',
  'Europe/Sarajevo', 'GMT', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam', 'Pacific/Honolulu',
  'Pacific/Midway', 'Pacific/Tongatapu', 'US/Alaska', 'US/Arizona', 'US/Central',
  'US/East-Indiana', 'US/Eastern', 'US/Mountain', 'UTC',
];

// Tried first, so a zone that isn't on the list gets the familiar name for its clock.
const PREFERRED = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'US/Alaska', 'Pacific/Honolulu',
];

// A zone's UTC offset at each of the next 53 weeks, which tells apart zones whose
// daylight saving starts or ends on different dates. Null for a zone Node doesn't know.
function clock(tz) {
  try {
    const format = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const now = Date.now();
    return Array.from({ length: 53 }, (_, week) => format
      .formatToParts(now + week * 7 * 24 * 60 * 60 * 1000)
      .find((part) => part.type === 'timeZoneName').value).join();
  } catch {
    return null;
  }
}

// The listed zone that shows the same time as `tz` all year, or null if none does.
function ghlTimezone(tz) {
  if (typeof tz !== 'string' || !tz) return null;
  if (GHL_TIMEZONES.includes(tz)) return tz;
  const target = clock(tz);
  if (!target) return null;
  return [...PREFERRED, ...GHL_TIMEZONES].find((zone) => clock(zone) === target) || null;
}

module.exports = { ghlTimezone };
