"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, FileText, FolderKanban, Layers, Tags, Image as ImageIcon, Menu as MenuIcon, Search, Inbox, Settings, Users,
  UserCircle, LogOut, Newspaper, LayoutTemplate, ExternalLink, X,
} from "lucide-react";
import { logout } from "@/server/admin/people";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/lib/auth/permissions";
import { FeedbackProvider } from "./feedback";

const NAV: { href: string; label: string; icon: typeof FileText; perm: PermissionKey }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/admin/pages", label: "Pages", icon: FileText, perm: "page.read" },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban, perm: "project.read" },
  { href: "/admin/services", label: "Services", icon: Layers, perm: "service.read" },
  { href: "/admin/articles", label: "Newsroom", icon: Newspaper, perm: "article.read" },
  { href: "/admin/taxonomies", label: "Categories", icon: Tags, perm: "project.read" },
  { href: "/admin/media", label: "Media library", icon: ImageIcon, perm: "media.read" },
  { href: "/admin/navigation", label: "Navigation", icon: MenuIcon, perm: "navigation.write" },
  { href: "/admin/templates", label: "Section templates", icon: LayoutTemplate, perm: "template.write" },
  { href: "/admin/seo", label: "SEO", icon: Search, perm: "seo.write" },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox, perm: "submission.read" },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings.write" },
  { href: "/admin/users", label: "Users & roles", icon: Users, perm: "user.manage" },
];

export function Shell({ user, perms, siteName, newSubmissions, children }: { user: { name: string; email: string; roleName: string }; perms: string[]; siteName: string; newSubmissions: number; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => perms.includes(n.perm));
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3" aria-label="Admin">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          aria-current={active(n.href) ? "page" : undefined}
          className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors", active(n.href) ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-200/70")}
        >
          <n.icon className="size-4 shrink-0" />
          <span className="flex-1">{n.label}</span>
          {n.href === "/admin/submissions" && newSubmissions > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", active(n.href) ? "bg-white text-zinc-900" : "bg-indigo-600 text-white")}>{newSubmissions}</span>}
        </Link>
      ))}
    </nav>
  );
  return (
    <FeedbackProvider>
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zinc-200 bg-[#efefed] transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
            <Link href="/admin" className="truncate font-semibold tracking-tight">{siteName}</Link>
            <a href="/" target="_blank" rel="noopener" className="text-zinc-500 hover:text-zinc-900" title="Open site" aria-label="Open public site">
              <ExternalLink className="size-4" />
            </a>
          </div>
          {nav}
          <div className="border-t border-zinc-200 p-3">
            <Link href="/admin/profile" className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-200/70">
              <UserCircle className="size-7 text-zinc-500" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{user.name}</span>
                <span className="block truncate text-[11px] text-zinc-500">{user.roleName}</span>
              </span>
            </Link>
            <form action={logout}>
              <button type="submit" className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-200/70">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </aside>
        {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <div className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden">
            <button type="button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" className="rounded p-1.5 hover:bg-zinc-100">
              {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
            <span className="font-semibold">{siteName}</span>
          </div>
          <main id="admin-main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-6" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </FeedbackProvider>
  );
}
