# payment-flow-simulator backend

This backend simulates a payment provider integration using AWS Lambda, API Gateway, DynamoDB, and a centralized payment state machine.

## Architecture

- `src/handlers`: Lambda entrypoints
- `src/application`: use-case orchestration
- `src/domain`: payment reducer, provider simulation, webhook event mapping
- `src/repositories`: repository contracts and DynamoDB adapters
- `src/infrastructure`: shared DynamoDB client and environment config
- `src/shared`: parsing, validation, HTTP helpers, and application errors

Core design choices:

- all payment transitions are centralized in a pure reducer
- webhook processing is idempotent through a dedicated idempotency table
- out-of-order events are handled without corrupting terminal state
- DynamoDB writes use a `version` field for optimistic locking

## Payment states

- `CREATED`
- `INITIATED`
- `REDIRECT_REQUIRED`
- `PROCESSING`
- `APPROVED`
- `FAILED`

## Endpoints

- `POST /payments`
- `POST /payments/{id}/initiate`
- `GET /payments/{id}`
- `POST /webhook`

## Local backend run

Install dependencies:

```bash
cd backend
npm install
```

Start DynamoDB Local:

```bash
docker run --rm -p 8000:8000 amazon/dynamodb-local
```

Copy the local env file:

```bash
copy env.example.json env.json
```

Create the local tables:

```bash
aws dynamodb create-table --table-name PaymentsTable --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 --region us-east-1

aws dynamodb create-table --table-name IdempotencyTable --attribute-definitions AttributeName=pk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000 --region us-east-1
```

Build and run:

```bash
npm run build
npm test
sam build
npm run sam:start
```

The local API is available at `http://127.0.0.1:3000`.

## Deploy with AWS SAM

```bash
cd backend
sam build
sam deploy --guided
```

Subsequent deploys:

```bash
cd backend
sam build
sam deploy
```

## Example curl commands

Create a payment:

```bash
curl -X POST http://127.0.0.1:3000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-demo-001" \
  -d "{\"amount\":1000,\"currency\":\"USD\"}"
```

Initiate a payment:

```bash
curl -X POST http://127.0.0.1:3000/payments/<payment-id>/initiate
```

Get a payment:

```bash
curl http://127.0.0.1:3000/payments/<payment-id>
```

Send a processing webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-001\",\"type\":\"payment.processing\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-13T12:00:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```

Send an approved webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-002\",\"type\":\"payment.approved\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-13T12:01:00.000Z\",\"providerReference\":\"prov_demo_001\"}"
```

Send a failed webhook:

```bash
curl -X POST http://127.0.0.1:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"evt-003\",\"type\":\"payment.failed\",\"paymentId\":\"<payment-id>\",\"occurredAt\":\"2026-04-13T12:02:00.000Z\",\"providerReference\":\"prov_demo_001\",\"failureReason\":\"issuer_declined\"}"
```

## Notes

For local browser-based testing, the backend now includes permissive CORS headers and HTTP API CORS configuration so the Vite frontend can call it directly.

