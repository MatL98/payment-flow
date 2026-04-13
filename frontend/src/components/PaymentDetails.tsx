import { Payment } from "../types/payment";
import { StatusBadge } from "./StatusBadge";

export function PaymentDetails({ payment }: { payment: Payment | null }) {
  if (!payment) {
    return (
      <div className="empty-state">
        <p>No payment loaded yet. Create one or fetch an existing payment ID.</p>
      </div>
    );
  }

  return (
    <div className="details-grid">
      <div className="detail-item">
        <span>Payment ID</span>
        <strong>{payment.id}</strong>
      </div>
      <div className="detail-item">
        <span>Status</span>
        <StatusBadge status={payment.status} />
      </div>
      <div className="detail-item">
        <span>Amount</span>
        <strong>
          {payment.currency} {payment.amount}
        </strong>
      </div>
      <div className="detail-item">
        <span>Transaction ID</span>
        <strong>{payment.providerReference ?? "Not assigned yet"}</strong>
      </div>
      <div className="detail-item detail-wide">
        <span>Redirect URL</span>
        <strong>{payment.redirectUrl ?? "Not available"}</strong>
      </div>
      <div className="detail-item detail-wide">
        <span>Failure Reason</span>
        <strong>{payment.failureReason ?? "None"}</strong>
      </div>
    </div>
  );
}
