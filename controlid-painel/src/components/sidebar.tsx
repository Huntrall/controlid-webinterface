"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Server,
  UserPlus,
  UserMinus,
  Settings,
  LogOut,
  ScanFace,
  ShieldCheck,
  ChevronRight,
  Activity,
  Users,
  Clock,
} from "lucide-react";

const navItems = [
  {
    href: "/devices",
    label: "Dispositivos",
    description: "Faciais e terminais",
    icon: Server,
  },
  {
    href: "/users",
    label: "Criar Usuários",
    description: "Cadastro e envio facial",
    icon: UserPlus,
  },
  {
    href: "/users/delete",
    label: "Excluir Usuários",
    description: "Remoção em massa e por ID",
    icon: UserMinus,
  },
  {
    href: "/settings",
    label: "Configurações",
    description: "Perfil de admin e senhas",
    icon: Settings,
  },
  {
    href: "/panel-users",
    label: "Gestores",
    description: "Contas de acesso ao painel",
    icon: Users,
  },
  {
    href: "/access-logs",
    label: "Relatório de Acessos",
    description: "Entradas e saídas",
    icon: Clock,
  },
];

interface SidebarProps {
  userName: string;
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("") || "AD";

  return (
    <aside className="w-64 shrink-0 border-r border-border/70 bg-sidebar flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <ScanFace className="size-6 animate-pulse" />
              <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm text-foreground">Control iD</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Painel
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Gestão Biométrica Facial</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Menu Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/devices" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                  active
                    ? "bg-primary/15 text-primary font-medium border border-primary/30 shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex items-center justify-center size-8 rounded-lg transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="truncate">
                    <p className="truncate leading-tight font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground/80 truncate leading-tight mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`size-4 transition-transform ${
                    active ? "text-primary translate-x-0.5" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="p-3 border-t border-border/60 space-y-3">
        {/* Quick Status Pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-emerald-500 animate-pulse" />
            <span className="text-muted-foreground font-medium">Gateway Ativo</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <span className="size-1.5 rounded-full bg-emerald-500"></span>
            Online
          </span>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/70 shadow-xs">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            title="Ir para Configurações"
          >
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary font-bold text-xs border border-primary/30 shrink-0">
              {initials}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight flex items-center gap-1">
                <ShieldCheck className="size-2.5 text-indigo-400 inline shrink-0" />
                Administrador
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Sair do painel"
            className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-1"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
