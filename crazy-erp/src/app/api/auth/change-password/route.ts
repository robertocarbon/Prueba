import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword, validatePassword } from '@/lib/auth';
import { authenticateRequest, successResponse, errorResponse, createAuditLog, getClientInfo } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return errorResponse('Contraseña actual y nueva son obligatorias');
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return errorResponse(validation.message);
    }

    const user = await prisma.user.findUnique({ where: { id: auth.user.userId } });
    if (!user) return errorResponse('Usuario no encontrado', 404);

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return errorResponse('Contraseña actual incorrecta');
    }

    if (currentPassword === newPassword) {
      return errorResponse('La nueva contraseña debe ser diferente a la actual');
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.id,
      action: 'update',
      entity: 'user',
      entityId: user.id,
      newData: { action: 'password_changed' },
      ipAddress,
      userAgent,
    });

    return successResponse({ message: 'Contraseña actualizada correctamente' });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
