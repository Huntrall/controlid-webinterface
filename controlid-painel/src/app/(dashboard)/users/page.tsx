"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        setSelectedDevices(data.map((d: Device) => d.id));
      });
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
      toast.error("Selecione ao menos um dispositivo");
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
      toast.success(`Usuário "${data.user.name}" criado com sucesso!`);
      setDeviceUserId("");
      setRegistration("");
      setName("");
      setPhoto(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      toast.warning("Usuário criado com falhas em alguns dispositivos");
    }
  }

  const resultBadge = (ok: boolean) =>
    ok ? (
      <Badge className="bg-green-600">OK</Badge>
    ) : (
      <Badge variant="destructive">Falha</Badge>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Criar Usuário</h1>
        <p className="text-sm text-muted-foreground">
          Cadastra o usuário e envia para as faciais selecionadas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Código na facial</Label>
                <Input
                  type="number"
                  min={2}
                  placeholder="Ex: 100"
                  value={deviceUserId}
                  onChange={(e) => setDeviceUserId(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">ID enviado aos dispositivos (evite 1)</p>
              </div>
              <div className="space-y-1">
                <Label>Matrícula / Registro</Label>
                <Input
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Foto (opcional)</Label>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  className="max-w-xs"
                />
                {preview && (
                  <img
                    src={preview}
                    alt="preview"
                    className="h-16 w-16 rounded-md object-cover border"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: JPEG até 500 KB, rosto centralizado
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Dispositivos</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
              {selectedDevices.length === devices.length ? "Desmarcar todos" : "Marcar todos"}
            </Button>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dispositivo cadastrado.{" "}
                <a href="/devices" className="underline">
                  Adicione um dispositivo primeiro.
                </a>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {devices.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedDevices.includes(d.id)}
                      onCheckedChange={() => toggleDevice(d.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.baseUrl}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting || devices.length === 0}>
          {submitting ? "Enviando para as faciais…" : "Criar e enviar"}
        </Button>
      </form>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado — usuário #{results.user.id} ({results.user.name})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Cadastro</TableHead>
                  {results.photoResults && <TableHead>Foto</TableHead>}
                  <TableHead>Grupo</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.createResults.map((r) => {
                  const photo = results.photoResults?.find((p) => p.deviceId === r.deviceId);
                  const group = results.groupResults.find((p) => p.deviceId === r.deviceId);
                  const access = results.accessResults.find((p) => p.deviceId === r.deviceId);
                  const firstError = [r, photo, group, access].find((x) => x && !x.ok);
                  return (
                    <TableRow key={r.deviceId}>
                      <TableCell className="font-medium">{r.deviceName}</TableCell>
                      <TableCell>{resultBadge(r.ok)}</TableCell>
                      {results.photoResults && (
                        <TableCell>{photo ? resultBadge(photo.ok) : "—"}</TableCell>
                      )}
                      <TableCell>{group ? resultBadge(group.ok) : "—"}</TableCell>
                      <TableCell>{access ? resultBadge(access.ok) : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {firstError?.message ?? ""}
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
