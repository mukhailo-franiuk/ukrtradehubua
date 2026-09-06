/*
  Warnings:

  - A unique constraint covering the columns `[orderSellerId]` on the table `SellerPayout` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderSellerId` to the `SellerPayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderSeller" ADD COLUMN     "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "sellerAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SellerPayout" ADD COLUMN     "orderSellerId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayout_orderSellerId_key" ON "SellerPayout"("orderSellerId");

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_orderSellerId_fkey" FOREIGN KEY ("orderSellerId") REFERENCES "OrderSeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
