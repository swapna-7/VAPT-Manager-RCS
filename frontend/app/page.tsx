import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Welcome to VAPT Manager</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold">Client organisations</h2>
            <p className="text-sm text-muted-foreground my-3">
              Register your organisation, select the services you require and invite your staff.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/auth/client-sign-up" className="btn-primary px-4 py-2 rounded bg-blue-600 text-white">Sign up (Client)</Link>
              <Link href="/auth/login" className="px-4 py-2 rounded border">Login (Client)</Link>
            </div>
          </section>

          <section className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold">Staff (Super-admin / Admin / Security-team)</h2>
            <p className="text-sm text-muted-foreground my-3">
              Staff users (super-admin, admin, security-team) can create accounts and access staff dashboards.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/auth/staff-sign-up" className="px-4 py-2 rounded border">Sign up (Staff)</Link>
              <Link href="/auth/login" className="btn-primary px-4 py-2 rounded bg-blue-600 text-white">Login (Staff)</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
