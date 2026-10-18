export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-2 h-8 w-64" />
      <div className="skeleton mb-8 h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="skeleton h-72 lg:col-span-2" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
