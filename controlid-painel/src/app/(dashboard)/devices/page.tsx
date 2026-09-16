"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  baseUrl: string;
  login: string;
  active: boolean;
  createdAt: string;
}

interface TestStatus {
  [id: string]: {
    state: "idle" | "testing" | "ok" | "error";
    message?: string;
  };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<TestStatus>({});
  const [testingAll, setTestingAll] = useState(false);

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addTesting, setAddTesting] = useState(false);
  const [addShowPassword, setAddShowPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    baseUrl: "",
    login: "admin",
    password: "",
  });

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTesting, setEditTesting] = useState(false);
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    baseUrl: "",
    login: "admin",
    password: "",
    active: true,
  });

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy IP feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      setLoading(true);
      const res = await fetch("/api/devices");
      if (!res.ok) throw new Error("Erro ao carregar dispositivos");
      const data = await res.json();
      setDevices(data);
    } catch {
      toast.error("Erro ao carregar lista de dispositivos.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyIp(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Endpoint copiado para a área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // --- Add Device ---
  async function handleTestAddConnection() {
    if (!addForm.baseUrl || !addForm.login || !addForm.password) {
      toast.error("Preencha URL, Login e Senha para testar a conexão.");
      return;
    }
    setAddTesting(true);
    try {
      const res = await fetch("/api/devices/test-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Conexão estabelecida com sucesso!");
      } else {
        toast.error(data.message || "Falha na conexão com a facial.");
      }
    } catch {
      toast.error("Erro inesperado ao testar conexão.");
    } finally {
      setAddTesting(false);
    }
  }

  async function handleSaveAdd() {
    if (!addForm.name.trim() || !addForm.baseUrl.trim() || !addForm.login.trim() || !addForm.password) {
      toast.error("Todos os campos são obrigatórios para cadastrar um dispositivo.");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao salvar dispositivo");
        return;
      }
      toast.success("Dispositivo facial adicionado com sucesso!");
      setAddOpen(false);
      setAddForm({ name: "", baseUrl: "", login: "admin", password: "" });
      fetchDevices();
    } catch {
      toast.error("Erro de rede ao salvar dispositivo.");
    } finally {
      setAddSaving(false);
    }
  }

  // --- Edit Device ---
  function openEditModal(device: Device) {
    setEditDevice(device);
    setEditForm({
      name: device.name,
      baseUrl: device.baseUrl,
      login: device.login,
      password: "", // blank means keep current
      active: device.active,
    });
    setEditShowPassword(false);
    setEditOpen(true);
  }

  async function handleTestEditConnection() {
    if (!editDevice || !editForm.baseUrl || !editForm.login) {
      toast.error("Preencha URL e Login para testar.");
      return;
    }
    setEditTesting(true);
    try {
      const res = await fetch("/api/devices/test-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: editDevice.id,
          baseUrl: editForm.baseUrl,
          login: editForm.login,
          password: editForm.password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Conexão validada com sucesso!");
      } else {
        toast.error(data.message || "Falha na conexão com os novos dados.");
      }
    } catch {
      toast.error("Erro ao testar conexão.");
    } finally {
      setEditTesting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editDevice) return;
    if (!editForm.name.trim() || !editForm.baseUrl.trim() || !editForm.login.trim()) {
      toast.error("Nome, URL/IP e Login são obrigatórios.");
      return;
    }

    setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
        baseUrl: editForm.baseUrl.trim(),
        login: editForm.login.trim(),
        active: editForm.active,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/devices/${editDevice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao atualizar dispositivo");
        return;
      }

      toast.success(`Dispositivo "${editForm.name}" atualizado com sucesso!`);
      setEditOpen(false);
      // Reset test status for this device
      setTestStatus((prev) => ({
        ...prev,
        [editDevice.id]: { state: "idle" },
      }));
      fetchDevices();
    } catch {
      toast.error("Erro de conexão ao atualizar dispositivo.");
    } finally {
      setEditSaving(false);
    }
  }

  // --- Delete Device ---
  function openDeleteModal(device: Device) {
    setDeviceToDelete(device);
    setDeleteOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deviceToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/devices/${deviceToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Dispositivo "${deviceToDelete.name}" removido com sucesso.`);
        setDeleteOpen(false);
        setDeviceToDelete(null);
        fetchDevices();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao remover dispositivo");
      }
    } catch {
      toast.error("Erro ao remover dispositivo");
    } finally {
      setDeleting(false);
    }
  }

  // --- Test Single Device ---
  async function handleTest(device: Device) {
    setTestStatus((prev) => ({
      ...prev,
      [device.id]: { state: "testing" },
    }));

    try {
      const res = await fetch(`/api/devices/${device.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestStatus((prev) => ({
        ...prev,
        [device.id]: {
          state: data.ok ? "ok" : "error",
          message: data.message,
        },
      }));

      if (data.ok) {
        toast.success(`${device.name}: ${data.message}`);
      } else {
        toast.error(`${device.name}: ${data.message}`);
      }
    } catch {
      setTestStatus((prev) => ({
        ...prev,
        [device.id]: { state: "error", message: "Falha de rede" },
      }));
      toast.error(`${device.name}: Falha de rede ao conectar`);
    }
  }

  // --- Test All Devices in Parallel ---
  async function handleTestAll() {
    if (devices.length === 0) return;
    setTestingAll(true);
    toast.info("Iniciando teste de conectividade em todas as faciais...");

    // Set all to testing
    const initialTestStatus: TestStatus = { ...testStatus };
    devices.forEach((d) => {
      initialTestStatus[d.id] = { state: "testing" };
    });
    setTestStatus(initialTestStatus);

    await Promise.allSettled(
      devices.map(async (device) => {
        try {
          const res = await fetch(`/api/devices/${device.id}/test`, { method: "POST" });
          const data = await res.json();
          setTestStatus((prev) => ({
            ...prev,
            [device.id]: {
              state: data.ok ? "ok" : "error",
              message: data.message,
            },
          }));
        } catch {
          setTestStatus((prev) => ({
            ...prev,
            [device.id]: { state: "error", message: "Falha de rede" },
          }));
        }
      })
    );

    setTestingAll(false);
    toast.success("Varredura de conectividade concluída!");
  }

  // Counts for KPIs
  const totalCount = devices.length;
  const connectedCount = Object.values(testStatus).filter((s) => s.state === "ok").length;
  const errorCount = Object.values(testStatus).filter((s) => s.state === "error").length;

  const renderStatusBadge = (id: string) => {
    const s = testStatus[id]?.state;
    if (s === "testing") {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 flex items-center gap-1.5 py-1">
          <RefreshCw className="size-3 animate-spin" />
          <span>Testando…</span>
        </Badge>
      );
    }
    if (s === "ok") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 py-1 shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </Badge>
      );
    }
    if (s === "error") {
      return (
        <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1.5 py-1">
          <XCircle className="size-3" />
          <span>Falha</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground/70 border-border/70 flex items-center gap-1.5 py-1">
        <Clock className="size-3 text-muted-foreground/60" />
        <span>Não testado</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dispositivos Faciais</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              Control iD
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os terminais biométricos cadastrados, credenciais e endpoints de comunicação.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleTestAll}
            disabled={testingAll || devices.length === 0}
            className="border-border/80 hover:bg-muted/70"
          >
            <RefreshCw className={`size-4 mr-2 ${testingAll ? "animate-spin" : ""}`} />
            {testingAll ? "Testando todos…" : "Testar todas"}
          </Button>

          <Button
            onClick={() => {
              setAddForm({ name: "", baseUrl: "", login: "admin", password: "" });
              setAddShowPassword(false);
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
          >
            <Plus className="size-4 mr-2" />
            Adicionar dispositivo
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cadastrado</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Terminais facial no painel</p>
            </div>
            <div className="size-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <Server className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conectados (Online)</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{connectedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resposta com sucesso</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Falhas / Alertas</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{errorCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Verifique IP ou credenciais</p>
            </div>
            <div className="size-11 rounded-xl bg-destructive/15 border border-destructive/25 flex items-center justify-center text-destructive">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices List Table */}
      <div className="rounded-xl border border-border/70 bg-card/70 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Lista de Terminais</h2>
            <Badge variant="secondary" className="text-xs font-normal">
              {devices.length} {devices.length === 1 ? "dispositivo" : "dispositivos"}
            </Badge>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-[220px]">Dispositivo</TableHead>
              <TableHead>Endpoint (URL / IP)</TableHead>
              <TableHead className="w-[120px]">Login</TableHead>
              <TableHead className="w-[140px]">Conexão</TableHead>
              <TableHead className="w-[100px]">Ativo</TableHead>
              <TableHead className="text-right w-[200px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Carregando dispositivos...
                </TableCell>
              </TableRow>
            )}

            {!loading && devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="size-12 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
                      <Radio className="size-6" />
                    </div>
                    <p className="font-medium text-foreground">Nenhum dispositivo cadastrado</p>
                    <p className="text-xs text-muted-foreground">
                      Adicione sua primeira facial Control iD informando o IP e as credenciais de acesso.
                    </p>
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="size-3.5 mr-1" />
                      Adicionar facial
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              devices.map((d) => (
                <TableRow key={d.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Server className="size-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-sm text-foreground truncate">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">iDFace Bio</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono px-2 py-1 rounded-md bg-muted/50 border border-border/60 text-foreground">
                        {d.baseUrl}
                      </code>
                      <button
                        onClick={() => handleCopyIp(d.id, d.baseUrl)}
                        title="Copiar endpoint"
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {copiedId === d.id ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/40">
                      {d.login}
                    </span>
                  </TableCell>

                  <TableCell>{renderStatusBadge(d.id)}</TableCell>

                  <TableCell>
                    {d.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                        Inativo
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTest(d)}
                        disabled={testStatus[d.id]?.state === "testing"}
                        title="Testar conexão"
                        className="hover:bg-primary/10 hover:text-primary h-8 px-2"
                      >
                        <RefreshCw
                          className={`size-3.5 ${testStatus[d.id]?.state === "testing" ? "animate-spin" : ""}`}
                        />
                        <span className="hidden md:inline ml-1">Testar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(d)}
                        title="Editar dispositivo"
                        className="border-border/70 hover:bg-muted/70 h-8 px-2"
                      >
                        <Pencil className="size-3.5 text-indigo-400" />
                        <span className="hidden md:inline ml-1">Editar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteModal(d)}
                        title="Remover dispositivo"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden md:inline ml-1">Remover</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* --- ADD DEVICE DIALOG --- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-5 text-primary" />
              Adicionar Dispositivo Facial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um novo terminal biométrico Control iD para envio de usuários e fotos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Identificador</Label>
              <Input
                placeholder="Ex: Catraca Entrada, Recepção, Portão..."
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-muted/30 border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endpoint / IP da Facial</Label>
              <Input
                placeholder="Ex: http://192.168.0.129 ou 192.168.20.100"
                value={addForm.baseUrl}
                onChange={(e) => setAddForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                className="bg-muted/30 border-border/70 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Informe o IP do dispositivo na rede local. O prefixo http:// será formatado automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Login da Facial</Label>
                <Input
                  value={addForm.login}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, login: e.target.value }))}
                  placeholder="admin"
                  className="bg-muted/30 border-border/70 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Senha da Facial</Label>
                <div className="relative">
                  <Input
                    type={addShowPassword ? "text" : "password"}
                    value={addForm.password}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha no aparelho"
                    className="bg-muted/30 border-border/70 font-mono text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPassword(!addShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {addShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Button Inside Dialog */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestAddConnection}
                disabled={addTesting || !addForm.baseUrl || !addForm.password}
                className="w-full text-xs border-dashed border-border/90 hover:bg-muted/60"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${addTesting ? "animate-spin" : ""}`} />
                {addTesting ? "Testando comunicação com a facial..." : "Testar conexão antes de salvar"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAdd} disabled={addSaving} className="bg-primary hover:bg-primary/90">
              {addSaving ? "Salvando..." : "Salvar Dispositivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT DEVICE DIALOG --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="size-5 text-indigo-400" />
              Editar Facial: {editDevice?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere o endpoint (IP), usuário de login e senha da facial com validação imediata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Identificador</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-muted/30 border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endpoint / IP da Facial</Label>
              <Input
                value={editForm.baseUrl}
                onChange={(e) => setEditForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                className="bg-muted/30 border-border/70 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Ex: http://192.168.20.102 (barras extras são removidas automaticamente).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Login da Facial</Label>
                <Input
                  value={editForm.login}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, login: e.target.value }))}
                  className="bg-muted/30 border-border/70 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nova Senha (Opcional)</Label>
                <div className="relative">
                  <Input
                    type={editShowPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Manter atual"
                    className="bg-muted/30 border-border/70 font-mono text-sm pr-9 placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {editShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
              💡 <strong>Dica:</strong> Se não quiser trocar a senha no banco, deixe o campo de senha em branco. Ao salvar, qualquer cache de sessão anterior será imediatamente invalidado.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/60">
              <div>
                <p className="text-xs font-semibold text-foreground">Status do Terminal</p>
                <p className="text-[11px] text-muted-foreground">Terminais inativos não recebem cadastros</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="size-4 accent-primary rounded cursor-pointer"
                />
                <span className="text-xs font-medium">{editForm.active ? "Ativo" : "Inativo"}</span>
              </label>
            </div>

            {/* Test Connection Button Inside Edit Dialog */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestEditConnection}
                disabled={editTesting || !editForm.baseUrl}
                className="w-full text-xs border-dashed border-border/90 hover:bg-muted/60"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${editTesting ? "animate-spin" : ""}`} />
                {editTesting ? "Testando comunicação..." : "Testar estes dados agora"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="bg-primary hover:bg-primary/90">
              {editSaving ? "Salvando…" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg">
              <AlertTriangle className="size-5" />
              Remover Dispositivo Facial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirme a exclusão do terminal cadastrado no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              Tem certeza que deseja remover o terminal{" "}
              <strong className="text-foreground">{deviceToDelete?.name}</strong> (
              <span className="font-mono text-xs text-muted-foreground">{deviceToDelete?.baseUrl}</span>) do painel?
            </p>

            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold">⚠️ O que acontece ao remover:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                <li>O dispositivo será desvinculado deste painel web.</li>
                <li>O histórico de logs de sincronização vinculado a este terminal será limpo.</li>
                <li>Os usuários já gravados fisicamente na memória da facial <strong>não</strong> serão apagados.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : "Sim, Remover Dispositivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
