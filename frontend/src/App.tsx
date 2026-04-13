import { FormEvent, useState } from "react";
import { createPayment, getPayment, initiatePayment, sendWebhook } from "./api/client";
import { PaymentDetails } from "./components/PaymentDetails";
import { SectionCard } from "./components/SectionCard";
import { Payment, WebhookEventType } from "./types/payment";

type BusyAction = "create" | "fetch" | "initiate" | "processing" | "approved" | "failed" | null;

const statusActions: Array<{
  type: WebhookEventType;
  label: string;
  failureReason?: string;
}> = [
  { type: "payment.processing", label: "Send processing" },
  { type: "payment.approved", label: "Send approved" },
  { type: "payment.failed", label: "Send failed", failureReason: "issuer_declined" }
];

export default function App() {
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("USD");
  const [paymentIdInput, setPaymentIdInput] = useState("");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [message, setMessage] = useState("Create a payment, initiate it, then simulate provider webhooks.");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create");

    try {
      const created = await createPayment({
        amount: Number(amount),
        currency
      });

      setPayment(created);
      setPaymentIdInput(created.id);
      setMessage(`Payment ${created.id} created in ${created.status}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFetch() {
    if (!paymentIdInput.trim()) {
      setMessage("Enter a payment ID to fetch.");
      return;
    }

    setBusyAction("fetch");

    try {
      const fetched = await getPayment(paymentIdInput.trim());
      setPayment(fetched);
      setMessage(`Fetched payment ${fetched.id}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleInitiate() {
    if (!payment?.id) {
      setMessage("Create or fetch a payment before initiating it.");
      return;
    }

    setBusyAction("initiate");

    try {
      const initiated = await initiatePayment(payment.id);
      setPayment(initiated);
      setMessage(`Payment moved to ${initiated.status}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWebhook(type: WebhookEventType, failureReason?: string) {
    if (!payment?.id) {
      setMessage("Create or fetch a payment before simulating webhooks.");
      return;
    }

    const action =
      type === "payment.processing" ? "processing" : type === "payment.approved" ? "approved" : "failed";

    setBusyAction(action);

    try {
      const result = await sendWebhook({
        paymentId: payment.id,
        type,
        providerReference: payment.providerReference,
        failureReason
      });

      setPayment(result.payment);
      setMessage(`Webhook ${type} processed. Current status: ${result.payment.status}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Weekend project</p>
          <h1>Payment Flow Simulator</h1>
          <p className="hero-copy">
            A compact interview demo for payment state transitions, webhook processing, and idempotent backend flows.
          </p>
        </div>
        <div className="hero-panel">
          <span>Backend</span>
          <strong>AWS Lambda + DynamoDB + SAM</strong>
          <span>Frontend</span>
          <strong>React + Vite</strong>
        </div>
      </section>

      <section className="layout-grid">
        <SectionCard title="Create payment" subtitle="Start a payment in CREATED status.">
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Amount
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
            </label>
            <label>
              Currency
              <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
            </label>
            <button type="submit" disabled={busyAction === "create"}>
              {busyAction === "create" ? "Creating..." : "Create payment"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Load payment" subtitle="Fetch an existing payment or work with the one you just created.">
          <div className="form-grid">
            <label>
              Payment ID
              <input value={paymentIdInput} onChange={(event) => setPaymentIdInput(event.target.value)} />
            </label>
            <button type="button" onClick={handleFetch} disabled={busyAction === "fetch"}>
              {busyAction === "fetch" ? "Fetching..." : "Fetch payment"}
            </button>
            <button type="button" onClick={handleInitiate} disabled={busyAction === "initiate"}>
              {busyAction === "initiate" ? "Initiating..." : "Initiate payment"}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Webhook simulator" subtitle="Drive the async provider flow manually from the UI.">
          <div className="button-row">
            {statusActions.map((action) => {
              const key =
                action.type === "payment.processing"
                  ? "processing"
                  : action.type === "payment.approved"
                    ? "approved"
                    : "failed";

              return (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => handleWebhook(action.type, action.failureReason)}
                  disabled={busyAction === key}
                >
                  {busyAction === key ? "Sending..." : action.label}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Payment details" subtitle="Current backend state, ready for demos.">
          <PaymentDetails payment={payment} />
        </SectionCard>
      </section>

      <section className="message-strip">
        <span>Flow output</span>
        <strong>{message}</strong>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

