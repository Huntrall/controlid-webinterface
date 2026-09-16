import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import Link from "next/link";
import { Settings, Shield, Wifi } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userName = session.user?.name ?? session.user?.email ?? "Administrador";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Modern Topbar */}
        <header className="h-14 border-b border-border/60 bg-card/40 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Shield className="size-3.5 text-indigo-400" />
              Painel de Acesso Facial
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Wifi className="size-3" />
              Rede Local Conectada
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Settings className="size-3.5" />
              <span>Configurações</span>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 md:p-8 relative">
          {/* Subtle ambient lighting in top corner */}
          <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
