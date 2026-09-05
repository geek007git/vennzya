-- Trigram indexes power the catalogue search (ILIKE '%term%') without a
-- sequential scan. Swap to Typesense/Meilisearch only once the catalogue
-- outgrows this — the query lives behind CatalogRepository.search().
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_description_trgm_idx"
  ON "Product" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx"
  ON "Category" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ProductVariant_sku_trgm_idx"
  ON "ProductVariant" USING GIN ("sku" gin_trgm_ops);

-- Admin order search by number/phone.
CREATE INDEX IF NOT EXISTS "Order_orderNumber_trgm_idx"
  ON "Order" USING GIN ("orderNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_contactPhone_trgm_idx"
  ON "Order" USING GIN ("contactPhone" gin_trgm_ops);
