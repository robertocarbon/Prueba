import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, generateRefreshToken, getTokenExpiry, getRefreshTokenExpiry, validatePassword } from '@/lib/auth';
import { successResponse, errorResponse, getClientInfo, createAuditLog } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return errorResponse('Email y contraseña son obligatorios');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        companies: {
          where: { active: true },
          include: { company: true },
        },
      },
    });

    if (!user || user.deletedAt) {
      await prisma.loginLog.create({
        data: { email, ipAddress, userAgent, success: false, reason: 'Usuario no encontrado' },
      });
      return errorResponse('Credenciales incorrectas', 401);
    }

    if (!user.active) {
      await prisma.loginLog.create({
        data: { email, userId: user.id, ipAddress, userAgent, success: false, reason: 'Cuenta desactivada' },
      });
      return errorResponse('Cuenta desactivada. Contacta al administrador', 401);
    }

    // Check if locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await prisma.loginLog.create({
        data: { email, userId: user.id, ipAddress, userAgent, success: false, reason: 'Cuenta bloqueada' },
      });
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return errorResponse(`Cuenta bloqueada. Intenta en ${minutes} minutos`, 423);
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      const newAttempts = user.failedAttempts + 1;
      const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      await prisma.loginLog.create({
        data: { email, userId: user.id, ipAddress, userAgent, success: false, reason: `Contraseña incorrecta (intento ${newAttempts})` },
      });

      if (newAttempts >= 5) {
        return errorResponse('Cuenta bloqueada por 30 minutos tras 5 intentos fallidos', 423);
      }

      return errorResponse('Credenciales incorrectas', 401);
    }

    // Success - reset failed attempts
    const tokenPayload = { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        ipAddress,
        userAgent,
        device: parseDevice(userAgent),
        expiresAt: getTokenExpiry(),
        refreshExpiresAt: getRefreshTokenExpiry(),
      },
    });

    await prisma.loginLog.create({
      data: { email, userId: user.id, ipAddress, userAgent, success: true },
    });

    await createAuditLog({
      userId: user.id,
      action: 'login',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return successResponse({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        theme: user.theme,
        language: user.language,
        mustChangePassword: user.mustChangePassword,
        isSuperAdmin: user.isSuperAdmin,
      },
      companies: user.companies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        role: uc.role,
        lastAccessAt: uc.lastAccessAt,
        logo: uc.company.logo,
      })),
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

function parseDevice(ua: string): string {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Desconocido';
}
