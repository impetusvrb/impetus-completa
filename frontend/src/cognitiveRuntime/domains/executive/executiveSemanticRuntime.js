const DENIED = /apr\/pt|loto|linha_|sensor_|nc individual|operador /i;

export function validateExecutiveSemantics(payload = {}) {
  const blob = JSON.stringify(payload);
  return { ok: !DENIED.test(blob), operational_leak: DENIED.test(blob) };
}

export default validateExecutiveSemantics;
