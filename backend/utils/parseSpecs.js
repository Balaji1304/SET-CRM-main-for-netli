// Safely coerce specifications to a plain object (handles strings, double-stringified JSON, etc.)
function parseSpecs(raw) {
  if (!raw) return {};
  let val = raw;
  for (let i = 0; i < 2 && typeof val === 'string'; i++) {
    try { val = JSON.parse(val); } catch { return {}; }
  }
  return (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
}

module.exports = parseSpecs;
