import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-graphite-800">{label}</span>
      {children}
      {error && <span className="text-xs text-signal-red">{error}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-graphite-700 focus:outline-none focus:ring-1 focus:ring-graphite-700 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-graphite-700 focus:outline-none focus:ring-1 focus:ring-graphite-700 ${props.className ?? ""}`}
    />
  );
}
