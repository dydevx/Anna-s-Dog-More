export default function ShopLoading() {
  return (
    <div className="shop-loading" role="status" aria-label="Produkte werden geladen / Loading products">
      <div className="shop-loading-heading" />
      <div className="shop-loading-grid">
        <div className="shop-loading-filter" />
        <div className="shop-loading-products">
          {Array.from({ length: 6 }, (_, index) => <div className="shop-loading-card" key={index} />)}
        </div>
      </div>
    </div>
  );
}
