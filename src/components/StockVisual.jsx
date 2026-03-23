export default function StockVisual({ stock, reorderAt, status, unit = '' }) {
  const max = reorderAt * 2.5;
  const percent = Math.min((stock / max) * 100, 100);

  return (
    <div className="stock-bar-container" title={`${stock}${unit} / reorder at ${reorderAt}${unit}`}>
      <div
        className={`stock-bar-fill ${status}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
