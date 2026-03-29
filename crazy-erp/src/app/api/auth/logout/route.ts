import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokenFromRequest, authenticateRequest } from '@/lib/api-utils';
import { successResponse, errorResponse, createAuditLog, getClientInfo } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const token = getTokenFromRequest(req);
    if (token) {
      await prisma.session.updateMany({
        where: { token },
        data: { active: false },
      });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.user.userId,
      action: 'logout',
      entity: 'user',
      entityId: auth.user.userId,
      ipAddress,
      userAgent,
    });

    return successResponse({ message: 'Sesión cerrada' });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
