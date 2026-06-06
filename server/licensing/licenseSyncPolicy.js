function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMostRecentSunday(now = new Date()) {
  const d = startOfDay(now);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Domingo: una vez al día. Otros días: si no se verificó el domingo anterior (app cerrada). */
function needsLicenseSync(row, now = new Date()) {
  if (!row?.product_key) return false;

  const lastSync = row.last_license_sync ? new Date(row.last_license_sync) : null;
  const todayStart = startOfDay(now);

  if (now.getDay() === 0) {
    if (!lastSync || Number.isNaN(lastSync.getTime())) return true;
    return lastSync < todayStart;
  }

  const recentSunday = getMostRecentSunday(now);
  if (!lastSync || Number.isNaN(lastSync.getTime())) return true;
  return lastSync < recentSunday;
}

module.exports = { needsLicenseSync, getMostRecentSunday, startOfDay };
