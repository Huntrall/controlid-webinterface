"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Device {
  id: string;
  name: string;
  baseUrl: string;
  login: string;
  active: boolean;
}

interface TestStatus {
  [id: string]: "idle" | "testing" | "ok" | "error";
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", baseUrl: "", login: "admin", password: "" });

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    const res = await fetch("/api/devices");
    const data = await res.json();
    setDevices(data);
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Erro ao salvar dispositivo");
      return;
    }
    toast.success("Dispositivo adicionado!");
    setDialogOpen(false);
    setForm({ name: "", baseUrl: "", login: "admin", password: "" });
    fetchDevices();
  }

  async function handleTest(device: Device) {
    setTestStatus((prev) => ({ ...prev, [device.id]: "testing" }));
    const res = await fetch(`/api/devices/${device.id}/test`, { method: "POST" });
    const data = await res.json();
    setTestStatus((prev) => ({ ...prev, [device.id]: data.ok ? "ok" : "error" }));
    if (data.ok) {
      toast.success(`${device.name}: ${data.message}`);
    } else {
      toast.error(`${device.name}: ${data.message}`);
    }
  }

  async function handleDelete(device: Device) {
    if (!confirm(`Remover "${device.name}" do painel? (não afeta a facial)`)) return;
    const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Dispositivo removido");
      fetchDevices();
    } else {
      toast.error("Erro ao remover dispositivo");
    }
  }

  const statusBadge = (id: string) => {
    const s = testStatus[id];
    if (s === "testing") return <Badge variant="secondary">Testando…</Badge>;
    if (s === "ok") return <Badge className="bg-green-600">Conectado</Badge>;
    if (s === "error") return <Badge variant="destructive">Falha</Badge>;
    return <Badge variant="outline">—</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dispositivos</h1>
          <p className="text-sm text-muted-foreground">Faciais Control iD cadastradas no painel</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Adicionar dispositivo</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>URL / IP</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum dispositivo cadastrado
                </TableCell>
              </TableRow>
            )}
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="font-mono text-sm">{d.baseUrl}</TableCell>
                <TableCell>{d.login}</TableCell>
                <TableCell>{statusBadge(d.id)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(d)}
                    disabled={testStatus[d.id] === "testing"}
                  >
                    Testar conexão
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(d)}
                  >
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar dispositivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                placeholder="ex: Recepção"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>URL / IP</Label>
              <Input
                placeholder="http://192.168.0.100"
                value={form.baseUrl}
                onChange={(e) => setField("baseUrl", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Login</Label>
              <Input
                value={form.login}
                onChange={(e) => setField("login", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
