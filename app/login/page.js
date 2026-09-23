"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="demo-entry">
      <div className="card demo-entry-card">
        <div className="demo-logo">N</div>
        <h1>NOVA Demo</h1>
        <p>Authentication is disabled. Continue directly to the demo terminal.</p>
        <button className="btn-primary" onClick={() => router.push("/dashboard")}>Enter demo</button>
      </div>
    </main>
  );
}
