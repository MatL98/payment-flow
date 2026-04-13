import { PaymentStatus } from "../types/payment";

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}

