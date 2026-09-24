# LABONI retail catalog source-data report

Last verified against all public LABONI retail catalog sections: 2026-09-24.

## Synchronized

- 190 of 190 unique source product pages
- 545 active product variants
- Source listing coverage: 69 Hundebetten, 9 Decken, 60 Spielen, 1 Napf, 36 Leinen & Halsbänder, 13 Herrchen & Frauchen and 15 Sale entries (Sale overlaps other sections)
- Product and variant prices use the source numeric value with the currency set to `CHF`
- Product name, article number/SKU, available options and source images
- Color-specific source galleries mapped through `product_images.variant_id` where the source provides a configurator
- Product base price updated to the lowest verified variant price

The catalog audit reports no missing source URLs, prices, SKUs, product images or variants, and no non-CHF product or variant records. Ten legacy product records that duplicated a current source URL were consolidated into their canonical product and retained as inactive records for order-history safety.

## Missing source data

### Numeric stock quantities

The LABONI storefront exposes an availability state but does not expose a numeric stock quantity. No stock value was invented. Existing database quantities were preserved; new variants remain at `0` until inventory is confirmed by Anna's Dog & More.

## Reproducibility

- Run `npm run import:catalog` to discover the current retail listings, upsert products, then synchronize configurator variants.
- Run `npm run sync:variants` to refresh variant data only.
- Run `npm run consolidate:catalog` to merge active legacy duplicates without deleting historical product records.
- Run `npm run audit:catalog` to compare all current source listing URLs with the imported catalog and verify completeness.

The synchronization does not delete variants or overwrite existing numeric stock quantities.
