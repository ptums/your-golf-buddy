import type { ReactNode } from "react";

/**
 * The header furniture that opens every screen: 4px ink rule, a dateline rail
 * (label left, status right), then a 1.5px ink rule. This is the only place
 * rules print outside the footer.
 */
export default function ScreenHeader({
  label,
  status,
}: {
  label: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="px-5 pt-[18px]">
      <div className="bs-rule" />
      <div className="flex items-center justify-between py-[9px]">
        <span className="bs-rail bs-rail-ink">{label}</span>
        {status != null && <span className="bs-rail bs-rail-net">{status}</span>}
      </div>
      <div className="bs-rule-thin" />
    </div>
  );
}
