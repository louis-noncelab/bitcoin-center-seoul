ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" <> '' AND cardinality("images") = 0;
