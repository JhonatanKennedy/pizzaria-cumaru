-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "paymentType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "flavors" TEXT[],
ADD COLUMN     "notes" TEXT;
