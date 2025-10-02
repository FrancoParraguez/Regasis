import type { DurationValue } from "../config/env.js";

type DurationUnit = "ms" | "s" | "m" | "h" | "d" | "w" | "y";

const durationMultipliers: Record<DurationUnit, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_557_600_000 // 365.25 days
};

export function durationToMs(duration: DurationValue): number {
  if(typeof duration === "number"){
    if(!Number.isFinite(duration)){
      throw new Error(`Duración inválida: ${duration}`);
    }
    return duration;
  }

  const trimmed = duration.trim();
  if(trimmed === ""){
    throw new Error("Duración inválida: cadena vacía");
  }

  const numeric = Number(trimmed);
  if(Number.isFinite(numeric) && /^[-+]?\d+(?:\.\d+)?$/.test(trimmed)){
    return numeric;
  }

  const match = trimmed.match(/^([-+]?\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$/i);
  if(!match){
    throw new Error(`Duración inválida: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase() as DurationUnit;
  const multiplier = durationMultipliers[unit];
  return value * multiplier;
}

export function addDuration(base: Date, duration: DurationValue){
  const baseDate = new Date(base);
  const durationMs = durationToMs(duration);
  if(durationMs < 0){
    throw new Error(`Duración inválida: ${duration}`);
  }
  baseDate.setTime(baseDate.getTime() + durationMs);
  return baseDate;
}
