"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  Server,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Send,
  Camera,
  Layers,
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  baseUrl: string;
  active: boolean;
}

interface DispatchResult {
  deviceId: string;
  deviceName: string;
  ok: boolean;
  message: string;
}

interface DispatchResponse {
  user: { id: number; name: string; registration: string };
  createResults: DispatchResult[];
  photoResults: DispatchResult[] | null;
  groupResults: DispatchResult[];
  accessResults: DispatchResult[];
}

export default function UsersPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceUserId, setDeviceUserId] = useState("");
  const [suggestedCode, setSuggestedCode] = useState<number | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
  const [registration, setRegistration] = useState("");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<DispatchResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data) => {
        setDevices(data);
        // Only select active devices by default
        const activeIds = data.filter((d: Device) => d.active !== false).map((d: Device) => d.id);
        setSelectedDevices(activeIds);
      })
      .catch(() => {
        toast.error("Erro ao carregar lista de terminais.");
      });

    fetch("/api/users/next-code")
      .then((r) => r.json())
      .then((data) => {
        if (data.nextCode) {
          setSuggestedCode(data.nextCode);
          setDeviceUserId(String(data.nextCode));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSuggestion(false));
  }, []);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  function toggleDevice(id: string) {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map((d) => d.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDevices.length === 0) {
      toast.error("Selecione ao menos um terminal facial para envio.");
      return;
    }
    setSubmitting(true);
    setResults(null);

    const fd = new FormData();
    fd.append("deviceUserId", deviceUserId);
    fd.append("registration", registration);
    fd.append("name", name);
    fd.append("deviceIds", JSON.stringify(selectedDevices));
    if (photo) fd.append("photo", photo);

    try {
      const res = await fetch("/api/users", { method: "POST", body: fd });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao criar usuário");
        return;
      }

      setResults(data);
      const allOk =
        data.createResults.every((r: DispatchResult) => r.ok) &&
        (!data.photoResults || data.photoResults.every((r: DispatchResult) => r.ok)) &&
        data.groupResults.every((r: DispatchResult) => r.ok) &&
        data.accessResults.every((r: DispatchResult) => r.ok);

      if (allOk) {
        toast.success(`Usuário "${data.user.name}" cadastrado e enviado com sucesso!`);
        setRegistration("");
        setName("");
        setSuggestedCode(null);
        fetch("/api/users/next-code")
          .then((r) => r.json())
          .then((d) => {
            if (d.nextCode) {
              setSuggestedCode(d.nextCode);
              setDeviceUserId(String(d.nextCode));
            }
          });
        setPhoto(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.warning("Usuário cadastrado com pendências em algumas faciais. Confira o relatório.");
      }
    } catch {
      setSubmitting(false);
      toast.error("Erro de conexão ao enviar dados.");
    }
  }

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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cadastrar Novo Usuário</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            Sincronização
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastra o colaborador no banco central e despacha simultaneamente para os terminais selecionados.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Identification Data */}
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                <UserPlus className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Identificação do Usuário</CardTitle>
                <CardDescription className="text-xs">
                  Dados de cadastro e identificador numérico interno da facial
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Código na Facial (ID)</Label>
                  {loadingSuggestion && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="size-2.5 animate-spin" /> Consultando…
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  min={2}
                  placeholder={loadingSuggestion ? "Consultando…" : "Ex: 100"}
                  value={deviceUserId}
                  onChange={(e) => {
                    setDeviceUserId(e.target.value);
                    setSuggestedCode(null);
                  }}
                  className="bg-muted/30 border-border/70 font-mono text-sm"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {suggestedCode !== null && deviceUserId === String(suggestedCode) ? (
                    <span className="text-indigo-400 flex items-center gap-1">
                      <Sparkles className="size-3 inline" /> Sugestão automática (próximo disponível)
                    </span>
                  ) : (
                    "Identificador único no hardware (evite o ID 1)"
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Matrícula / Registro</Label>
                <Input
                  placeholder="Ex: 2024001 ou CPF"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="bg-muted/30 border-border/70"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Número de matrícula no RH ou código</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Completo</Label>
                <Input
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/30 border-border/70"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Nome exibido na tela da facial</p>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs font-semibold block mb-2">Foto para Reconhecimento Facial (Opcional)</Label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-muted/20 transition-all rounded-xl p-4 cursor-pointer flex items-center justify-center gap-3 text-center"
                >
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UploadCloud className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">
                      {photo ? photo.name : "Clique para selecionar foto"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Recomendado: JPEG até 500 KB, rosto centralizado e boa iluminação
                    </p>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handlePhoto}
                  className="hidden"
                />

                {preview ? (
                  <div className="relative group shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Prévia do rosto"
                      className="size-16 rounded-xl object-cover border-2 border-primary shadow-xs ring-2 ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center shadow-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="size-16 rounded-xl border border-border/60 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground/60 shrink-0">
                    <Camera className="size-5" />
                    <span className="text-[9px] mt-0.5">Sem foto</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Selection Card */}
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Layers className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Terminais de Destino</CardTitle>
                <CardDescription className="text-xs">
                  Selecione para quais faciais as credenciais e acessos serão sincronizados
                </CardDescription>
              </div>
            </div>

            {devices.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
                {selectedDevices.length === devices.length ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {devices.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs space-y-2">
                <p>Nenhum dispositivo facial cadastrado no momento.</p>
                <a href="/devices" className="text-primary underline font-medium">
                  Ir para Dispositivos e cadastrar terminal
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {devices.map((d) => {
                  const isChecked = selectedDevices.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20"
                          : "bg-muted/20 border-border/70 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleDevice(d.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">{d.baseUrl}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {selectedDevices.length} {selectedDevices.length === 1 ? "terminal selecionado" : "terminais selecionados"}
          </p>

          <Button
            type="submit"
            disabled={submitting || devices.length === 0 || selectedDevices.length === 0}
            className="bg-primary hover:bg-primary/90 px-6"
          >
            {submitting ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Despachando para as faciais…
              </>
            ) : (
              <>
                <Send className="size-4 mr-2" />
                Cadastrar e Enviar
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Dispatch Results Summary */}
      {results && (
        <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <div>
                  <CardTitle className="text-base font-semibold">
                    Relatório de Envio — {results.user.name} (Código #{results.user.id})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Matrícula: {results.user.registration}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/60">
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Cadastro</TableHead>
                  {results.photoResults && <TableHead>Foto Facial</TableHead>}
                  <TableHead>Grupo (1)</TableHead>
                  <TableHead>Regra de Acesso</TableHead>
                  <TableHead>Detalhe Técnico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.createResults.map((r) => {
                  const photoResult = results.photoResults?.find((p) => p.deviceId === r.deviceId);
                  const groupResult = results.groupResults.find((p) => p.deviceId === r.deviceId);
                  const accessResult = results.accessResults.find((p) => p.deviceId === r.deviceId);
                  const firstError = [r, photoResult, groupResult, accessResult].find((x) => x && !x.ok);

                  return (
                    <TableRow key={r.deviceId} className="border-border/60">
                      <TableCell className="font-medium text-sm flex items-center gap-2">
                        <Server className="size-3.5 text-muted-foreground" />
                        {r.deviceName}
                      </TableCell>
                      <TableCell>{resultBadge(r.ok)}</TableCell>
                      {results.photoResults && (
                        <TableCell>{photoResult ? resultBadge(photoResult.ok) : "—"}</TableCell>
                      )}
                      <TableCell>{groupResult ? resultBadge(groupResult.ok) : "—"}</TableCell>
                      <TableCell>{accessResult ? resultBadge(accessResult.ok) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {firstError?.message ?? "Operação concluída com sucesso"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
