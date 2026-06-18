"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  }

  async function handleDelete(user: User) {
    if (
      !confirm(
        `Excluir "${user.name}" (matrícula: ${user.registration}) de TODOS os dispositivos?`
      )
    )
      return;

    setDeleting(user.id);
    setLastResults(null);
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data: DeleteResponse = await res.json();
    setDeleting(null);
    setLastResults({ userId: user.id, data });

    const allOk = data.deleteResults.every((r) => r.ok);
    if (allOk) {
      toast.success(`"${user.name}" excluído de todos os dispositivos`);
      fetchUsers();
    } else {
      toast.warning("Exclusão com falhas em alguns dispositivos — veja o resultado abaixo");
      fetchUsers();
    }
  }

  async function handleQuickDelete(e: React.FormEvent) {
    e.preventDefault();
    const code = parseInt(quickCode, 10);
    if (!confirm(`Excluir código ${code} de TODOS os dispositivos?`)) return;
    setQuickDeleting(true);
    setQuickResults(null);
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
      toast.success(`Código ${code} excluído de todos os dispositivos`);
      setQuickCode("");
      fetchUsers();
    } else {
      toast.warning("Exclusão com falhas em alguns dispositivos");
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.registration.includes(search)
  );

  const resultBadge = (ok: boolean) =>
    ok ? (
      <Badge className="bg-green-600">OK</Badge>
    ) : (
      <Badge variant="destructive">Falha</Badge>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Excluir Usuários</h1>
        <p className="text-sm text-muted-foreground">
          A exclusão envia o comando para todos os dispositivos ativos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Excluir por código</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickDelete} className="flex items-end gap-3">
            <div className="space-y-1">
              <Label>Código na facial</Label>
              <Input
                ref={quickRef}
                type="number"
                min={1}
                placeholder="Ex: 100"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                className="w-40"
                required
              />
            </div>
            <Button type="submit" variant="destructive" disabled={quickDeleting}>
              {quickDeleting ? "Excluindo…" : "Excluir de todos os dispositivos"}
            </Button>
          </form>

          {quickResults && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                Resultado — código #{quickResults.code}
                {!quickResults.data.foundInDb && (
                  <span className="text-muted-foreground font-normal ml-2">(não estava no banco local)</span>
                )}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickResults.data.deleteResults.map((r) => (
                    <TableRow key={r.deviceId}>
                      <TableCell className="font-medium">{r.deviceName}</TableCell>
                      <TableCell>{resultBadge(r.ok)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.ok ? "" : r.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Input
        placeholder="Buscar por nome ou matrícula…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-sm">{u.id}</TableCell>
                <TableCell>{u.registration}</TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(u)}
                    disabled={deleting === u.id}
                  >
                    {deleting === u.id ? "Excluindo…" : "Excluir"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado da exclusão — usuário #{lastResults.userId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastResults.data.deleteResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-sm">
                      Nenhum dispositivo ativo para enviar o comando
                    </TableCell>
                  </TableRow>
                )}
                {lastResults.data.deleteResults.map((r) => (
                  <TableRow key={r.deviceId}>
                    <TableCell className="font-medium">{r.deviceName}</TableCell>
                    <TableCell>{resultBadge(r.ok)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.ok ? "" : r.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-2">
              {lastResults.data.removedFromDb
                ? "Usuário removido do banco local."
                : "Usuário mantido no banco local (houve falha em algum dispositivo)."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
