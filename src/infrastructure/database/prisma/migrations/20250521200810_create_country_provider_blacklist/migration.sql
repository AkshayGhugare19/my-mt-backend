-- CreateTable
CREATE TABLE "country_providers_blacklist" (
    "id" SERIAL NOT NULL,
    "country" CHAR(3) NOT NULL,
    "providers" TEXT[],

    CONSTRAINT "country_providers_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_providers_blacklist_country_key" ON "country_providers_blacklist"("country");
