function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

export const config = {
  paymentsTableName: requireEnv("PAYMENTS_TABLE_NAME"),
  idempotencyTableName: requireEnv("IDEMPOTENCY_TABLE_NAME")
};

