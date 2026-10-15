"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, ShieldCheck, Mail, Lock, Plus, Users, Trash2 } from "lucide-react";

interface PanelUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function PanelUsersPage() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/panel-users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
      })
      .catch(() => toast.error("Erro ao carregar gestores"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/panel-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar gestor");
      } else {
        toast.success("Gestor criado com sucesso!");
        setName("");
        setEmail("");
        setPassword("");
        loadUsers();
      }
    } catch (err) {
      toast.error("Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestores do Sistema</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            Administração
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as contas que têm acesso ao painel web para cadastros e relatórios.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-border/70 bg-card/70 backdrop-blur-sm shadow-xs h-fit sticky top-6">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                <UserPlus className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Novo Gestor</CardTitle>
                <CardDescription className="text-xs">
                  Crie uma nova credencial de acesso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Completo</Label>
                <div className="relative">
                  <Input
                    placeholder="Ex: João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/70"
                    required
                  />
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="joao@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/70"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Senha Temporária</Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/70"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 mt-2">
                {submitting ? "Criando..." : (
                  <>
                    <Plus className="size-4 mr-2" />
                    Cadastrar Gestor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Gestores Cadastrados</CardTitle>
                  <CardDescription className="text-xs">
                    Lista de todos os administradores do painel
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
                Carregando gestores...
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border-t border-border/40">
                Nenhum gestor cadastrado.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/60">
                    <TableHead className="pl-6">Nome / Email</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border/60 group">
                      <TableCell className="pl-6">
                        <div className="font-medium text-sm text-foreground">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="size-3" />
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
