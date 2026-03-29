import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRefreshToken, generateToken, generateRefreshToken, getTokenExpiry, getRefreshTokenExpiry } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return errorResponse('Refresh token requerido', 400);
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return errorResponse('Refresh token inválido', 401);
    }

    const session = await prisma.session.findFirst({
      where: { refreshToken, active: true, refreshExpiresAt: { gt: new Date() } },
    });

    if (!session) {
      return errorResponse('Sesión no encontrada o expirada', 401);
    }

    const newToken = generateToken({ userId: payload.userId, email: payload.email, isSuperAdmin: payload.isSuperAdmin });
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email, isSuperAdmin: payload.isSuperAdmin });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: getTokenExpiry(),
        refreshExpiresAt: getRefreshTokenExpiry(),
      },
    });

    return successResponse({ token: newToken, refreshToken: newRefreshToken });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
