/*
  Warnings:

  - A unique constraint covering the columns `[endpoint,user_id]` on the table `push_subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "push_subscriptions_endpoint_key";

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_user_id_key" ON "push_subscriptions"("endpoint", "user_id");
