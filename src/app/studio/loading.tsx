export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <div className="skeleton" style={{ width: "40%", height: 28 }} />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" style={{ width: "70%" }} />
    </div>
  );
}
