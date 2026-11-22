export function validateMediaTarget(spec) {
  const errors = [];
  if (spec.pixelFormat !== "yuv420p") errors.push("pixelFormat must be yuv420p");
  if (spec.sampleRateHz !== 48000) errors.push("sampleRateHz must be 48000");
  if (spec.targetLoudnessLufs > -12 || spec.targetLoudnessLufs < -18) {
    errors.push("targetLoudnessLufs out of broadcast range [-18, -12]");
  }
  return { ok: errors.length === 0, errors };
}
