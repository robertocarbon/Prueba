import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, successResponse, errorResponse, createAuditLog, getClientInfo } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, photo: true, theme: true, language: true,
        telegramChatId: true, lastLoginAt: true, createdAt: true,
      },
    });

    return successResponse({ user });
  } catch {
    return errorResponse('Error interno', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const data = await req.json();
    const allowed = ['firstName', 'lastName', 'phone', 'photo', 'theme', 'language', 'telegramChatId'];
    const updateData: Record<string, unknown> = {};

    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    const oldUser = await prisma.user.findUnique({ where: { id: auth.user.userId } });
    const user = await prisma.user.update({
      where: { id: auth.user.userId },
      data: updateData,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, photo: true, theme: true, language: true,
        telegramChatId: true,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.user.userId,
      action: 'update',
      entity: 'user',
      entityId: auth.user.userId,
      oldData: oldUser,
      newData: updateData,
      ipAddress,
      userAgent,
    });

    return successResponse({ user });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
