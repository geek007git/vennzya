-- DropIndex
DROP INDEX "Category_name_trgm_idx";

-- DropIndex
DROP INDEX "Order_contactPhone_trgm_idx";

-- DropIndex
DROP INDEX "Order_orderNumber_trgm_idx";

-- DropIndex
DROP INDEX "Product_description_trgm_idx";

-- DropIndex
DROP INDEX "Product_name_trgm_idx";

-- DropIndex
DROP INDEX "ProductVariant_sku_trgm_idx";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phoneNumberVerified" DROP NOT NULL;
