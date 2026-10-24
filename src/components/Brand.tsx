import Link from "next/link";

export function Brand({ admin = false, light = false }: { admin?: boolean; light?: boolean }) {
  return (
    <Link href={admin ? "/admin" : "/"} className="brand" aria-label="AXIS">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-word" style={light ? { color: "#fff" } : undefined}>AXIS</span>
      {admin ? <span className="small muted" style={light ? { color: "#9FB0CB" } : undefined}>الإدارة</span> : null}
    </Link>
  );
}
