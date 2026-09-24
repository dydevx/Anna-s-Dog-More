# LABONI catalog source-data report

Last verified against the three-page LABONI Hundebetten catalog: 2026-09-24.

## Synchronized

- 69 of 69 source product pages
- 362 product variants
- 21 upholstered beds, 12 orthopaedic beds, 7 dog cushions, 26 bed accessories and 3 fragrance products
- Product and variant prices use the source numeric value with the currency set to `CHF`
- Product name, article number/SKU, available options and source images
- Color-specific source galleries mapped through `product_images.variant_id` where the source provides a configurator
- Product base price updated to the lowest verified variant price

The catalog audit reports no missing source URLs, prices, SKUs, product images or variants, and no non-CHF product or variant records.

## Missing source data

### Numeric stock quantities

The LABONI storefront exposes an availability state but does not expose a numeric stock quantity. No stock value was invented. Existing database quantities were preserved; new variants remain at `0` until inventory is confirmed by Anna's Dog & More.

## Reproducibility

- Run `npm run import:hundebetten` to discover the current source listing, upsert products, then synchronize configurator variants.
- Run `npm run sync:variants` to refresh variant data only.
- Run `npm run audit:hundebetten` to compare all current source listing URLs with the imported catalog and verify completeness.

The synchronization does not delete variants or overwrite existing numeric stock quantities.
