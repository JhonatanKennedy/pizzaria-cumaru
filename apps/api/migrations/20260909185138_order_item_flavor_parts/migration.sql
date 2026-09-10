-- Alters OrderItem.flavors from a JSON array of flavor names (Prisma scalar
-- list storage) to a JSON composition of { name, pieces }[] — the pizza's
-- fatias, base flavor first. Existing rows predate the fatia model and carry
-- no size tokens, so they map by convention: a lone name is the whole pizza
-- (default canvas G = 8); multiple names split the 8-fatia canvas into equal
-- shares when the count divides it cleanly (two names -> half/half); any
-- other row keeps an empty composition, since no quantities were recorded.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "flavors_parts" JSONB;

UPDATE "OrderItem" oi
SET "flavors_parts" = CASE
  WHEN "flavors" IS NULL OR array_length("flavors", 1) = 0 THEN '[]'::jsonb
  WHEN 8 % array_length("flavors", 1) = 0 THEN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name',
        el,
        'pieces',
        8 / array_length(oi."flavors", 1)
      )
    )
    FROM unnest(oi."flavors") AS el
  )
  ELSE '[]'::jsonb
END;

ALTER TABLE "OrderItem" DROP COLUMN "flavors";

ALTER TABLE "OrderItem" ALTER COLUMN "flavors_parts" SET NOT NULL;

ALTER TABLE "OrderItem" RENAME COLUMN "flavors_parts" TO "flavors";
