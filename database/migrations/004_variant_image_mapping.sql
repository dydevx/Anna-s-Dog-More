begin;

create index if not exists product_images_variant_idx
  on public.product_images(variant_id, sort_order)
  where variant_id is not null;

comment on column public.product_images.variant_id is
  'Optional source-verified variant mapping. Images without a variant remain shared product images.';

commit;
