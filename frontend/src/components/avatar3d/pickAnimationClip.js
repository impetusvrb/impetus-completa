/**
 * @param {import('three').AnimationClip[]|undefined|null} clipList
 * @param {string|undefined} hintRaw
 * @param {boolean} fallbackFirst
 * @returns {import('three').AnimationClip|null}
 */
export function pickAnimationClip(clipList, hintRaw, fallbackFirst) {
  if (!clipList?.length) return null;
  const hint = String(hintRaw ?? '').trim();
  if (hint && /^\d+$/.test(hint)) return clipList[Number(hint)] ?? null;
  if (hint) {
    const low = hint.toLowerCase();
    return clipList.find((c) => c.name.toLowerCase().includes(low)) ?? null;
  }
  return fallbackFirst ? clipList[0] : null;
}
