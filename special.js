// The fictional offer is available daily from 08:00 until local midnight.
// Cart lines keep the discount they received when added, independently of this clock.
export function specialStatus(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { active: false, remainingSeconds: 0 };
  }

  const active = now.getHours() >= 8;
  const boundary = new Date(now.getTime());
  boundary.setHours(active ? 24 : 8, 0, 0, 0);

  return {
    active,
    remainingSeconds: Math.max(0, Math.ceil((boundary.getTime() - now.getTime()) / 1000)),
  };
}
