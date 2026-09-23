# Catalog seed/import

The normalized, source-backed seed catalog lives in `data/catalog.ts`. Import it only after applying all migrations:

```bash
npm run import:catalog
```

The importer upserts categories, products, variants, images, attributes, and set items. It preserves each LABONI `Art.-Nr.` as both `sku` and `article_number`.

Prices or variant combinations that could not be confirmed from LABONI or the supplied PDFs are deliberately inactive. Shipping rates, VAT rules, legal copy, and merchant credentials are not seeded because they require a business decision.
