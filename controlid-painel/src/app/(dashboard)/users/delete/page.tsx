"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Users,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";

interface User {
  id: number;
  registration: string;
  name: string;
  photoPath: string | null;
  createdAt: string;
}

interface DispatchResult {
  deviceId: string;
  deviceName: string;
  ok: boolean;
  message: string;
}

interface DeleteResponse {
  deleteResults: DispatchResult[];
  removedFromDb: boolean;
}

interface QuickDeleteResult {
  deleteResults: DispatchResult[];
  removedFromDb: boolean;
  foundInDb: boolean;
}

export default function DeleteUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<{
    userId: number;
    data: DeleteResponse;
  } | null>(null);

  const [quickCode, setQuickCode] = useState("");
  const [quickDeleting, setQuickDeleting] = useState(false);
  const [quickResults, setQuickResults] = useState<{ code: number; data: QuickDeleteResult } | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  // Custom confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  function promptDelete(user: User) {
    setUserToDelete(user);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    const user = userToDelete;
    setDeleting(user.id);
    setLastResults(null);
    setConfirmOpen(false);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data: DeleteResponse = await res.json();
      setDeleting(null);
      setLastResults({ userId: user.id, data });

      const allOk = data.deleteResults.every((r) => r.ok);
      if (allOk) {
        toast.success(`"${user.name}" excluído de todas as faciais.`);
        fetchUsers();
      } else {
        toast.warning("Exclusão concluída com falha em alguns dispositivos.");
        fetchUsers();
      }
    } catch {
      setDeleting(null);
      toast.error("Erro de comunicação ao excluir usuário.");
    }
  }

  async function handleQuickDelete(e: React.FormEvent) {
    e.preventDefault();
    const code = parseInt(quickCode, 10);
    if (isNaN(code) || code < 1) {
      toast.error("Informe um código numérico válido.");
      return;
    }

    setQuickDeleting(true);
    setQuickResults(null);

    try {
      const res = await fetch("/api/users/by-code", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceUserId: code }),
      });
      const data: QuickDeleteResult = await res.json();
      setQuickDeleting(false);
      setQuickResults({ code, data });

      const allOk = data.deleteResults.every((r) => r.ok);
      if (allOk) {
        toast.success(`Código facial ${code} excluído de todos os dispositivos.`);
        setQuickCode("");
        fetchUsers();
      } else {
        toast.warning("Exclusão por código com falhas em algumas faciais.");
      }
    } catch {
      setQuickDeleting(false);
      toast.error("Erro ao enviar exclusão por código.");
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.registration.includes(search)
  );

  const resultBadge = (ok: boolean) =>
    ok ? (
      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
        <CheckCircle2 className="size-3" /> OK
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1">
        <XCircle className="size-3" /> Falha
      </Badge>
    );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exclusão de Usuários</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
            Remoção
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Remova cadastros simultaneamente de todas as faciais ativas e do banco de dados local.
        </p>
      </div>

      {/* Quick Delete by Device Code Card */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Hash className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Exclusão Direta por Código na Facial</CardTitle>
              <CardDescription className="text-xs">
                Útil para apagar usuários órfãos que estão na facial mas não constam no banco de dados local
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleQuickDelete} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1.5 w-full sm:w-56">
              <Label className="text-xs font-semibold">Código na Facial (ID)</Label>
              <Input
                ref={quickRef}
                type="number"
                min={1}
                placeholder="Ex: 100"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                className="bg-muted/30 border-border/70 font-mono text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={quickDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              {quickDeleting ? "Despachando exclusão…" : "Excluir de todas as faciais"}
            </Button>
          </form>

          {quickResults && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-xs font-semibold mb-2 text-foreground">
                Resultado do comando para o código #{quickResults.code}:{" "}
                {!quickResults.data.foundInDb && (
                  <span className="text-muted-foreground font-normal">(não estava no banco local)</span>
                )}
              </p>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/60">
                    <TableHead>Terminal Facial</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead>Resposta da Facial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickResults.data.deleteResults.map((r) => (
                    <TableRow key={r.deviceId} className="border-border/60">
                      <TableCell className="font-medium text-xs flex items-center gap-2">
                        <Server className="size-3.5 text-muted-foreground" />
                        {r.deviceName}
                      </TableCell>
                      <TableCell>{resultBadge(r.ok)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.ok ? "Exclusão aceita pela facial" : r.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Database Users Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Buscar por nome ou matrícula…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/30 border-border/70 pl-9"
            />
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Badge variant="secondary" className="text-xs">
            <Users className="size-3 mr-1.5 inline text-primary" />
            {filtered.length} {filtered.length === 1 ? "usuário" : "usuários"}
          </Badge>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="w-[100px]">ID Facial</TableHead>
                <TableHead className="w-[180px]">Matrícula</TableHead>
                <TableHead>Nome Completo</TableHead>
                <TableHead className="w-[160px]">Cadastrado em</TableHead>
                <TableHead className="text-right w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Carregando usuários cadastrados...
                  </TableCell>
                </TableRow>
              )}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((u) => (
                  <TableRow key={u.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <code className="text-xs font-mono px-2 py-0.5 rounded bg-muted/50 border border-border/50">
                        #{u.id}
                      </code>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.registration}</TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">{u.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => promptDelete(u)}
                        disabled={deleting === u.id}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        {deleting === u.id ? "Excluindo…" : "Excluir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg">
              <AlertTriangle className="size-5" />
              Excluir Usuário de Todas as Faciais
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação enviará o comando de exclusão de biometria e cadastro para todas as faciais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-foreground">
            <p>
              Tem certeza que deseja excluir o usuário:
            </p>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <p className="font-bold text-foreground">{userToDelete?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                Matrícula: {userToDelete?.registration} • Código Facial: #{userToDelete?.id}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              A foto e a regra de acesso serão removidas permanentemente.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Excluir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Last Delete Results */}
      {lastResults && (
        <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">
              Resultado da Exclusão — Usuário #{lastResults.userId}
            </CardTitle>
            <CardDescription className="text-xs">
              {lastResults.data.removedFromDb
                ? "Usuário removido do banco de dados local com sucesso."
                : "Atenção: Houve falha em algum dispositivo. O usuário foi mantido no banco local para reprocessamento."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/60">
                  <TableHead>Terminal Facial</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastResults.data.deleteResults.map((r) => (
                  <TableRow key={r.deviceId} className="border-border/60">
                    <TableCell className="font-medium text-xs flex items-center gap-2">
                      <Server className="size-3.5 text-muted-foreground" />
                      {r.deviceName}
                    </TableCell>
                    <TableCell>{resultBadge(r.ok)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {r.ok ? "Usuário e imagem removidos" : r.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
