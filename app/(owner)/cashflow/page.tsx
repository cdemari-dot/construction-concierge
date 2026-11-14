import { redirect } from "next/navigation";

// The 13-week forecast now lives on the combined Finance & Cash page.
export default function CashflowRedirect() {
  redirect("/finance");
}
