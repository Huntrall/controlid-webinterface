"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScanFace, Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      setLoading(false);
      if (res?.error) {
        setError("Email ou senha incorretos.");
      } else {
        router.push("/devices");
      }
    } catch {
      setLoading(false);
      setError("Erro ao autenticar. Verifique sua conexão.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-indigo-700 text-white shadow-xl shadow-primary/25 ring-1 ring-white/20 mx-auto">
            <ScanFace className="size-9 animate-pulse" />
            <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-500 ring-4 ring-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Control iD Painel</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Interface Web de Gestão e Acesso Biométrico Facial
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardHeader className="pb-2 text-center">
            <h2 className="text-base font-semibold text-foreground">Acesso ao Sistema</h2>
            <p className="text-xs text-muted-foreground">Entre com suas credenciais de administrador</p>
          </CardHeader>

          <CardContent className="pt-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email de Acesso
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@local.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted/30 border-border/70 pl-9"
                    required
                  />
                  <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Senha do Painel
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/30 border-border/70 pl-9 pr-9"
                    required
                  />
                  <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <span className="font-semibold">Erro:</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 py-2.5 h-auto mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Validando acesso...
                  </>
                ) : (
                  <>
                    Entrar no Painel
                    <ArrowRight className="size-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security footer note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>Sessão protegida por JWT e criptografia de hardware</span>
        </div>
      </div>
    </div>
  );
}
