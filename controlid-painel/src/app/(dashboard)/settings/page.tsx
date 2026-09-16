"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Database,
  Cpu,
  Save,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  // Password change data
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setName(data.name || "");
          setEmail(data.email || "");
          if (data.createdAt) {
            setCreatedAt(
              new Date(data.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            );
          }
        }
      })
      .catch(() => {
        if (!ignore) toast.error("Erro ao carregar dados do administrador.");
      })
      .finally(() => {
        if (!ignore) setProfileLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e email não podem ficar vazios.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar perfil.");
        return;
      }

      toast.success("Dados do perfil atualizados com sucesso!");
    } catch {
      toast.error("Erro de conexão ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Informe a senha atual para confirmar a alteração.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve possuir ao menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao trocar a senha.");
        return;
      }

      toast.success("Senha do administrador alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erro de conexão ao alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  // Simple password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "" };
    let s = 0;
    if (pass.length >= 6) s += 1;
    if (pass.length >= 8) s += 1;
    if (/[A-Z]/.test(pass)) s += 1;
    if (/[0-9]/.test(pass)) s += 1;
    if (/[^A-Za-z0-9]/.test(pass)) s += 1;

    if (s <= 2) return { score: 33, text: "Fraca", color: "bg-red-500" };
    if (s <= 4) return { score: 66, text: "Média", color: "bg-amber-500" };
    return { score: 100, text: "Forte", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações & Administrador</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            Segurança
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Atualize suas informações pessoais, email de acesso e credenciais de segurança do painel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile & Security Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                  <User className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Dados do Administrador</CardTitle>
                  <CardDescription className="text-xs">
                    Nome e email utilizados para login no painel
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {profileLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Carregando dados do administrador...
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome Completo</Label>
                    <div className="relative">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do administrador"
                        className="bg-muted/30 border-border/70 pl-9"
                        required
                      />
                      <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email de Acesso (Login)</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@empresa.com.br"
                        className="bg-muted/30 border-border/70 pl-9"
                        required
                      />
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Este email é a credencial utilizada na tela de autenticação.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {createdAt ? `Conta criada em ${createdAt}` : ""}
                    </span>
                    <Button type="submit" disabled={savingProfile} className="bg-primary hover:bg-primary/90">
                      <Save className="size-3.5 mr-1.5" />
                      {savingProfile ? "Salvando…" : "Salvar Perfil"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Alterar Senha de Acesso</CardTitle>
                  <CardDescription className="text-xs">
                    Recomendamos senhas fortes com números e caracteres especiais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual para confirmar"
                      className="bg-muted/30 border-border/70 pr-9 pl-9"
                      required
                    />
                    <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="bg-muted/30 border-border/70 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="pt-1 space-y-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${strength.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">
                          Força: <span className="font-semibold">{strength.text}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="bg-muted/30 border-border/70 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {confirmPassword && newPassword && (
                      <p className="text-[11px] pt-1">
                        {confirmPassword === newPassword ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Senhas conferem
                          </span>
                        ) : (
                          <span className="text-destructive">As senhas não coincidem</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingPassword} className="bg-primary hover:bg-primary/90">
                    <KeyRound className="size-3.5 mr-1.5" />
                    {savingPassword ? "Atualizando Senha…" : "Atualizar Senha"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security Status and Architecture Info */}
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                Segurança do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-muted-foreground">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <Shield className="size-3.5 text-indigo-400" />
                    Criptografia de Faciais
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">AES-256-GCM</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Senhas dos terminais são criptografadas em repouso com chave simétrica de 256 bits.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <Database className="size-3.5 text-indigo-400" />
                    Armazenamento Local
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">LibSQL / SQLite</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Banco de dados embutido com integridade relacional e exclusão em cascata ativa.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-indigo-400" />
                    Comunicação Control iD
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">API FCGI v2</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sessões otimizadas com cache TTL de 9 minutos e sanitização automática de URLs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
