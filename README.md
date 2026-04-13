# payment-flow-simulator

`payment-flow-simulator` is a small project with:

- `backend/`: Node.js + TypeScript + AWS Lambda + API Gateway + DynamoDB + AWS SAM
- `frontend/`: React + TypeScript + Vite

The goal is to demo a realistic payment lifecycle with a pure reducer/state machine, asynchronous webhook updates, idempotency, and a tiny UI that makes the flow easy to show in an interview.

## Project layout

```text
backend/
  src/
  tests/
  events/
  template.yaml
frontend/
  src/
  public/
```

## Backend highlights

- payment states: `CREATED`, `INITIATED`, `REDIRECT_REQUIRED`, `PROCESSING`, `APPROVED`, `FAILED`
- endpoints:
  - `POST /payments`
  - `POST /payments/{id}/initiate`
  - `GET /payments/{id}`
  - `POST /webhook`
- centralized reducer for transitions
- webhook deduplication via idempotency table
- reasonable handling for out-of-order provider events

## Frontend highlights

- create payment form
- fetch payment by ID
- initiate payment button
- webhook simulator buttons for processing, approved, and failed
- payment detail panel showing status, redirect URL, transaction ID, and failure reason

## Run locally

Backend:

```bash
cd backend
npm install
copy env.example.json env.json
docker run --rm -p 8000:8000 amazon/dynamodb-local
```

In another terminal:

```bash
cd backend
aws dynamodb create-table --table-name PaymentsTable --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 --region us-east-1
aws dynamodb create-table --table-name IdempotencyTable --attribute-definitions AttributeName=pk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 --region us-east-1
npm run build
npm test
sam build
npm run sam:start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:5173` and talks to the backend at `http://127.0.0.1:3000` by default.

## Deploy backend

```bash
cd backend
sam build
sam deploy --guided
```

## Demo flow

1. Open the frontend.
2. Create a payment.
3. Initiate it and show the `REDIRECT_REQUIRED` status with a redirect URL.
4. Simulate `payment.processing`.
5. Simulate `payment.approved` or `payment.failed`.
6. Fetch the payment again to show persisted state.

## Example API calls

Create:

```bash
curl -X POST http://127.0.0.1:3000/payments \
  -H "Content-Type: application/json" \
  -d "{\"amount\":1000,\"currency\":\"USD\"}"
```

Initiate:

```bash
curl -X POST http://127.0.0.1:3000/payments/<payment-id>/initiate
```

Get:

```bash
curl http://127.0.0.1:3000/payments/<payment-id>
```

Webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-002\",\"type\":\"payment.approved\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-13T12:01:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```
