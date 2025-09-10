-- AlterTable
ALTER TABLE "users" ADD COLUMN     "max_bet_size" DECIMAL(65,30),
ADD COLUMN     "max_exposure" DECIMAL(65,30),
ADD COLUMN     "max_number_of_users" INTEGER;
