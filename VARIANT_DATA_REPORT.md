# Variant source-data report

Last verified against the LABONI product configurator: 2026-09-24.

## Synchronized

- 17 configurable bed products
- 90 exact source variants
- Variant price, article number/SKU, size, color and primary image
- Color-specific source galleries mapped through `product_images.variant_id`
- Product base price updated to the lowest verified variant price

## Missing source data

### Numeric stock quantities

The LABONI storefront exposes an availability state but does not expose a numeric stock quantity. No stock value was invented. Existing database quantities were preserved; new variants remain at `0` until inventory is confirmed by Anna's Dog & More.

This applies to all 90 synchronized bed variants.

### PRADO Design-Hundebett CHIC

The current source page does not expose a variant configurator. Only the existing product-level offer/SKU can be verified. Additional color variants were not generated.

## Reproducibility

Run `npm run sync:variants` to re-read source configurators and upsert verified variant data. The sync does not delete variants or overwrite existing numeric stock quantities.
