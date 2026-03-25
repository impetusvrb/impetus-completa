/** Classifica índices de morph targets (RPM / ARKit / nomes genéricos). */

const MOUTH_HINT = /mouth|jaw|lip|viseme|v_|^a$|wolf3d|phoneme|bdc|sil/i;

export function classifyFaceMorphs(rootObject) {
  const mouth = new Map();
  const blink = new Map();
  const brow = new Map();
  const exprHappy = new Map();
  const exprSurprise = new Map();
  const exprLow = new Map();
  const look = [];

  const push = (map, mesh, idx) => {
    if (!map.has(mesh)) map.set(mesh, []);
    map.get(mesh).push(idx);
  };

  rootObject.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
    for (const name of Object.keys(o.morphTargetDictionary)) {
      const idx = o.morphTargetDictionary[name];
      const low = name.toLowerCase();

      if (MOUTH_HINT.test(name)) {
        const smileOnly =
          /smile|grin/i.test(low) &&
          !/open|close|funnel|pucker|stretch|narrow|wide|jaw|viseme|v_|^a$/i.test(low);
        if (!smileOnly) {
          push(mouth, o, idx);
          continue;
        }
      }

      if (
        (/blink|eye_close|eyesclosed|squint|eyesquint/i.test(name) || /\bblink\b/i.test(low)) &&
        !/mouth|jaw|tongue|lip|smile|brow/i.test(low)
      ) {
        push(blink, o, idx);
        continue;
      }

      if (/brow|eyebrow/i.test(low)) {
        push(brow, o, idx);
        continue;
      }

      if (/eyelook|eyegaze|gaze/i.test(low) && !/mouth|brow|blink|jaw/i.test(low)) {
        let mode = 'any';
        if (/lookup|look_up|eyeup/i.test(low)) mode = 'up';
        else if (/lookdown|look_down|eyedown/i.test(low)) mode = 'down';
        else if (/lookin|look_in/i.test(low)) mode = 'in';
        else if (/lookout|look_out/i.test(low)) mode = 'out';
        look.push({ mesh: o, idx, mode });
        continue;
      }

      if (
        (/happy|smile|pleasant|grin/i.test(low) || /^smile/i.test(low)) &&
        !/eye|brow|blink|jaw|tongue/i.test(low)
      ) {
        push(exprHappy, o, idx);
        continue;
      }

      if (/surpris|shock|wow|startl/i.test(low) && !/eye|brow|blink/i.test(low)) {
        push(exprSurprise, o, idx);
        continue;
      }

      if (
        (/sad|sorrow|melanch|frown|angry|rage|mad|furrow|scowl/i.test(low) ||
          /\banger\b/i.test(low)) &&
        !/eye|brow|blink|jaw|tongue/i.test(low)
      ) {
        push(exprLow, o, idx);
      }
    }
  });

  return { mouth, blink, brow, exprHappy, exprSurprise, exprLow, look };
}

export function pickAnimationClip(clipList, hintName, fallbackFirst) {
  if (!clipList?.length) return null;
  const hint = String(hintName ?? '').trim();
  if (hint && /^\d+$/.test(hint)) return clipList[Number(hint)] ?? null;
  if (hint) {
    const low = hint.toLowerCase();
    return clipList.find((c) => c.name.toLowerCase().includes(low)) ?? null;
  }
  return fallbackFirst ? clipList[0] : null;
}
