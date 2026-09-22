CREATE TABLE "ExchangeRateCache" (
    "id" TEXT NOT NULL,
    "krwPerBtc" DECIMAL(30,10) NOT NULL,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRateCache_pkey" PRIMARY KEY ("id")
);
