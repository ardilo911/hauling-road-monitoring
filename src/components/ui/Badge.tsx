export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "neutral";
}) {
  const styles: Record<string, string> = {
    green: "bg-signal-green/10 text-signal-green border-signal-green/30",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    red: "bg-signal-red/10 text-signal-red border-signal-red/30",
    blue: "bg-signal-blue/10 text-signal-blue border-signal-blue/30",
    neutral: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}
