"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.href = "/"; }
  }
  return <button className="btn btn-small" type="button" onClick={logout} disabled={busy}><LogOut size={15}/>{busy ? "جارٍ الخروج…" : "خروج"}</button>;
}
