import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user = await db.panelUser.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário administrador não encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user = await db.panelUser.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário administrador não encontrado" }, { status: 404 });
  }

  const { name, email, currentPassword, newPassword } = await req.json();

  const updateData: { name?: string; email?: string; passwordHash?: string } = {};

  // Update name if provided
  if (typeof name === "string" && name.trim().length > 0) {
    updateData.name = name.trim();
  }

  // Update email if provided and changed
  if (typeof email === "string" && email.trim().length > 0) {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 });
    }

    if (trimmedEmail !== user.email) {
      const conflict = await db.panelUser.findUnique({ where: { email: trimmedEmail } });
      if (conflict) {
        return NextResponse.json({ error: "Este email já está em uso por outro usuário." }, { status: 409 });
      }
      updateData.email = trimmedEmail;
    }
  }

  // Update password if requested
  if (newPassword && typeof newPassword === "string" && newPassword.trim().length > 0) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Informe a senha atual para autorizar a troca de senha." },
        { status: 400 }
      );
    }

    const isMatch = await compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "A senha atual informada está incorreta." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    updateData.passwordHash = await hash(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum dado informado para atualização." }, { status: 400 });
  }

  const updatedUser = await db.panelUser.update({
    where: { id: user.id },
    data: updateData,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    message: "Dados atualizados com sucesso!",
    user: updatedUser,
  });
}
