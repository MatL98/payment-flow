# payment-flow-simulator

`payment-flow-simulator` is a small production-style backend project that simulates a payment provider integration using AWS Lambda, API Gateway, DynamoDB, and a centralized payment state machine.

## Architecture Overview

The project is intentionally split into simple layers:

- `src/handlers`: thin Lambda adapters for HTTP concerns only
- `src/application`: orchestration and use-case logic
- `src/domain`: payment state machine, provider simulation, and event mapping
- `src/repositories`: DynamoDB persistence adapters and repository contracts
- `src/infrastructure`: shared AWS client and environment configuration
- `src/shared`: validation, parsing, HTTP helpers, and app-level errors

Design choices:

- State transitions are centralized in `src/domain/payment/stateMachine.ts`
- Webhooks are idempotent through the `IdempotencyTable`
- Out-of-order events are handled defensively in the reducer
- DynamoDB writes use optimistic locking via a `version` field
- `POST /payments` and `POST /payments/{id}/initiate` optionally support the `Idempotency-Key` header

## Payment Lifecycle

Supported states:

- `CREATED`
- `INITIATED`
- `REDIRECT_REQUIRED`
- `PROCESSING`
- `APPROVED`
- `FAILED`

Typical happy path:

1. `POST /payments` creates a payment in `CREATED`
2. `POST /payments/{id}/initiate` moves it to `INITIATED`
3. The provider simulation returns a `redirectUrl` and the payment becomes `REDIRECT_REQUIRED`
4. `POST /webhook` with `payment.processing` can move it to `PROCESSING`
5. `POST /webhook` with `payment.approved` moves it to `APPROVED`

Reasonable out-of-order handling:

- `payment.approved` can arrive before `payment.processing`
- late `payment.processing` does not regress an already approved payment
- once approved, later failure events are ignored

## Sequence Diagram

```text
Client              API                Service/Reducer         DynamoDB             Provider
  | POST /payments    |                        |                   |                   |
  |------------------>| create payment         |                   |                   |
  |                   |----------------------->| reduce CREATED    |                   |
  |                   |                        |------------------>| save payment      |
  |<------------------| 201 CREATED            |                   |                   |
  | POST /payments/:id/initiate                |                   |                   |
  |------------------>| initiate payment       |                   |                   |
  |                   |----------------------->| INITIATED         |                   |
  |                   |----------------------->| REDIRECT_REQUIRED |                   |
  |                   |                        |------------------>| update payment    |
  |<------------------| 200 + redirectUrl      |                   |                   |
  |                                                                             redirect|
  | POST /webhook                                                             event      |
  |<-------------------------------------------------------------------------|
  |------------------>| process webhook        |                   |                   |
  |                   |----------------------->| reduce event      |                   |
  |                   |                        |------------------>| update payment    |
  |<------------------| 200                    |                   |                   |
```

## DynamoDB Design

### `PaymentsTable`

- Partition key: `id`
- Stores the full payment aggregate
- Includes `version` for optimistic locking

Example item shape:

```json
{
  "id": "payment-id",
  "amount": 1000,
  "currency": "USD",
  "status": "REDIRECT_REQUIRED",
  "redirectUrl": "https://provider.example.test/checkout/...",
  "providerReference": "prov_123",
  "version": 3,
  "createdAt": "2026-04-12T12:00:00.000Z",
  "updatedAt": "2026-04-12T12:01:00.000Z"
}
```

### `IdempotencyTable`

- Partition key: `pk`
- `pk` format: `<scope>#<key>`
- Used for API idempotency and webhook deduplication

Scopes used:

- `payment:create`
- `payment:initiate`
- `webhook:event`

## How Idempotency Works

For API requests:

- If `Idempotency-Key` is provided on create or initiate, the service stores a record linked to the payment ID
- Replaying the same request key returns the already-created or already-initiated payment instead of performing the action again

For webhooks:

- The webhook uses `eventId` as the idempotency key
- The service writes the event record with a conditional put
- If the same event is sent twice, the second request is acknowledged safely and no state mutation runs

## Local Development

### Prerequisites

- Node.js 20+
- AWS SAM CLI
- Docker

### Install

```bash
npm install
```

### Build and Test

```bash
npm run build
npm test
sam build
```

### Run Locally

```bash
sam local start-api
```

The API will be available at `http://127.0.0.1:3000`.

## Deploy with AWS SAM

First deployment:

```bash
sam build
sam deploy --guided
```

Subsequent deployments:

```bash
sam build
sam deploy
```

## Example API Calls

Create a payment:

```bash
curl -X POST http://127.0.0.1:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-demo-001" \
  -d "{\"amount\":1000,\"currency\":\"USD\"}"
```

Initiate a payment:

```bash
curl -X POST http://127.0.0.1:3000/payments/<payment-id>/initiate \
  -H "Idempotency-Key: initiate-demo-001"
```

Fetch a payment:

```bash
curl http://127.0.0.1:3000/payments/<payment-id>
```

Send a processing webhook:

```bashs
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-001\",\"type\":\"payment.processing\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-12T12:00:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```

Send an approved webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-002\",\"type\":\"payment.approved\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-12T12:01:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```

Replay the same approved webhook safely:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-002\",\"type\":\"payment.approved\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-12T12:01:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```

Send a failed webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-003\",\"type\":\"payment.failed\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-12T12:02:00.000Z\",\"providerReference\":\"prov_demo_001\",\"failureReason\":\"issuer_declined\"}"
```

## Notes for Interviews

This project is designed to be easy to explain:

- business rules live in one reducer
- Lambda handlers stay thin
- persistence and AWS concerns stay behind repository interfaces
- idempotency and concurrency are handled in a practical, non-overengineered way
