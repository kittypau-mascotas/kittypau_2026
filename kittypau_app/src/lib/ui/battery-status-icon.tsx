import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
} from "lucide-react";

type BatteryStatusIconProps = {
  level: number | null | undefined;
  charging?: boolean;
  className?: string;
};

export default function BatteryStatusIcon({
  level,
  charging = false,
  className = "h-4 w-4",
}: BatteryStatusIconProps) {
  if (charging) {
    return <BatteryCharging className={`${className} text-emerald-600`} aria-hidden="true" />;
  }
  if (level === null || level === undefined || Number.isNaN(level)) {
    return <BatteryWarning className={`${className} text-slate-400`} aria-hidden="true" />;
  }
  if (level <= 15) {
    return <BatteryWarning className={`${className} text-rose-600`} aria-hidden="true" />;
  }
  if (level <= 35) {
    return <BatteryLow className={`${className} text-amber-600`} aria-hidden="true" />;
  }
  if (level <= 70) {
    return <BatteryMedium className={`${className} text-sky-600`} aria-hidden="true" />;
  }
  return <BatteryFull className={`${className} text-emerald-600`} aria-hidden="true" />;
}
