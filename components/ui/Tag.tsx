type TagColor = "cyan" | "lime" | "amber" | "red" | "mute";

export function Tag({ color, children }: { color: TagColor; children: React.ReactNode }) {
  return <span className={`cc-tag ${color}`}>{children}</span>;
}
