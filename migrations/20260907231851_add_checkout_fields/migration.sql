/*
  Warnings:

  - Changed the type of `userId` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "closedAt" TIMESTAMP(3),
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;
