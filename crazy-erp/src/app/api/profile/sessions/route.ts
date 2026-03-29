import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const sessions = await prisma.session.findMany({
      where: { userId: auth.user.userId, active: true },
      select: {
        id: true, ipAddress: true, userAgent: true, device: true,
        createdAt: true, expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ sessions });
  } catch {
    return errorResponse('Error interno', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { sessionId } = await req.json();
    if (!sessionId) return errorResponse('ID de sesión requerido');

    await prisma.session.update({
      where: { id: sessionId, userId: auth.user.userId },
      data: { active: false },
    });

    return successResponse({ message: 'Sesión cerrada' });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
