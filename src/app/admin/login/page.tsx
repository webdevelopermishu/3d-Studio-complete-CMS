import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/server/queries";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight">{settings.siteName}</p>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-base font-semibold">Sign in to the admin</h1>
          <p className="mb-6 text-sm text-zinc-500">Use your editor account.</p>
          <LoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
        </div>
      </div>
    </main>
  );
}
