import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        photo: true,
        theme: true,
        language: true,
        mustChangePassword: true,
        isSuperAdmin: true,
        telegramChatId: true,
        lastLoginAt: true,
        companies: {
          where: { active: true },
          include: {
            company: {
              select: { id: true, name: true, logo: true, active: true },
            },
            permissions: true,
          },
        },
      },
    });

    if (!user) return errorResponse('Usuario no encontrado', 404);

    return successResponse({ user });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
