"use client";
export function Toast({ message, error = false }: { message?: string; error?: boolean }) {
  if (!message) return null;
  return <div role="status" className={`alert ${error ? "error" : "success"}`}>{message}</div>;
}
