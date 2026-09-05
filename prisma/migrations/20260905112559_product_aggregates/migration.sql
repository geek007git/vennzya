-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "maxPrice" DECIMAL(10,2),
ADD COLUMN     "minPrice" DECIMAL(10,2),
ADD COLUMN     "totalStock" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_status_minPrice_idx" ON "Product"("status", "minPrice");

-- CreateIndex
CREATE INDEX "Product_status_totalStock_idx" ON "Product"("status", "totalStock");
