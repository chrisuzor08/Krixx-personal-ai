import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="gradient-text text-7xl font-semibold tracking-tight">404</div>
        <h1 className="mt-4 text-xl font-semibold">This page wandered off</h1>
        <p className="mt-2 text-sm text-muted">The page or agent you&apos;re looking for doesn&apos;t exist or isn&apos;t published.</p>
        <Link href="/" className="btn-primary mt-6">Back home</Link>
      </div>
    </div>
  );
}
