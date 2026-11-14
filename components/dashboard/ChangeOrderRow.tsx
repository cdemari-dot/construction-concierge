"use client";

import { useState, useTransition } from "react";
import { priceChangeOrder, sendChangeOrderToGc, setChangeOrderStatus } from "@/app/(owner)/change-orders/actions";
import { Tag } from "@/components/ui/Tag";
import { fmt } from "@/lib/format";
import type { ChangeOrder } from "@/lib/types/database";

const TAG_COLOR: Record<ChangeOrder["status"], "cyan" | "lime" | "amber" | "red" | "mute"> = {
  pending: "amber",
  priced: "cyan",
  sent_to_gc: "cyan",
  approved: "lime",
  disputed: "red",
  rejected: "red",
};

export function ChangeOrderRow({ co, jobLabel }: { co: ChangeOrder; jobLabel: string }) {
  const [amount, setAmount] = useState(String(co.amount));
  const [pending, startTransition] = useTransition();

  return (
    <div className="cc-card" style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--mute)" }}>{jobLabel}</div>
          <div style={{ fontSize: 13.5 }}>{co.description}</div>
        </div>
        <Tag color={TAG_COLOR[co.status]}>{co.status.replaceAll("_", " ")}</Tag>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={co.status !== "pending"}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line2)",
            borderRadius: 8,
            color: "var(--text)",
            padding: "6px 8px",
            width: 120,
            fontSize: 13,
          }}
        />

        {co.status === "pending" && (
          <button
            className="cc-btn sm"
            disabled={pending}
            onClick={() => startTransition(() => priceChangeOrder(co.id, Number(amount) || 0))}
            type="button"
          >
            Price it
          </button>
        )}
        {co.status === "priced" && (
          <button className="cc-btn sm" disabled={pending} onClick={() => startTransition(() => sendChangeOrderToGc(co.id))} type="button">
            Send to GC · {fmt(co.amount)}
          </button>
        )}
        {co.status === "sent_to_gc" && (
          <>
            <button
              className="cc-btn lime sm"
              disabled={pending}
              onClick={() => startTransition(() => setChangeOrderStatus(co.id, "approved"))}
              type="button"
            >
              Mark approved
            </button>
            <button
              className="cc-btn red sm"
              disabled={pending}
              onClick={() => startTransition(() => setChangeOrderStatus(co.id, "disputed"))}
              type="button"
            >
              Mark disputed
            </button>
          </>
        )}
      </div>
    </div>
  );
}
