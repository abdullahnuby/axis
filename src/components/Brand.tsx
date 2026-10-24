import Link from "next/link";
import { AxisLogoMark } from "@/components/AxisLogoMark";

type BrandProps = {
  admin?: boolean;
  light?: boolean;
  variant?: "compact" | "lockup" | "mark";
  className?: string;
};

/** Uses the appropriate brand lockup for the context instead of repeating the full logo everywhere. */
export function Brand({ admin = false, light = false, variant = "compact", className = "" }: BrandProps) {
  const classes = ["brand", `brand-${variant}`, light ? "brand-inverse" : "", admin ? "brand-admin" : "", className].filter(Boolean).join(" ");
  return (
    <Link href={admin ? "/admin" : "/"} className={classes} aria-label={admin ? "AXIS — لوحة الإدارة" : "AXIS — Social Media Platform"}>
      <span className="brand-mark" aria-hidden="true"><AxisLogoMark className="brand-mark-svg" title=""/></span>
      {variant !== "mark" ? <span className={`brand-copy${variant === "lockup" ? " brand-copy-lockup" : ""}`}>
        <span className="brand-word">AXIS</span>
        {variant === "lockup" ? <span className="brand-tagline">SOCIAL MEDIA PLATFORM</span> : null}
      </span> : null}
      {admin ? <span className="small brand-admin-label">لوحة الإدارة</span> : null}
    </Link>
  );
}
