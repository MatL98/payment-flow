export interface IdempotencyRecord {
  key: string;
  scope: string;
  paymentId: string;
  createdAt: string;
}

export interface IdempotencyRepository {
  get(scope: string, key: string): Promise<IdempotencyRecord | null>;
  put(record: IdempotencyRecord): Promise<boolean>;
}

