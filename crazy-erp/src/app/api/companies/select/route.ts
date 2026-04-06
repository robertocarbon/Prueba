import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, successResponse, errorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { companyId } = await req.json();
    if (!companyId) return errorResponse('ID de empresa requerido');

    const userCompany = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: auth.user.userId, companyId } },
      include: { company: true, permissions: true },
    });

    if (!userCompany || !userCompany.active) {
      return errorResponse('No tienes acceso a esta empresa', 403);
    }

    await prisma.userCompany.update({
      where: { id: userCompany.id },
      data: { lastAccessAt: new Date() },
    });

    return successResponse({
      company: {
        id: userCompany.company.id,
        name: userCompany.company.name,
        cif: userCompany.company.cif,
        logo: userCompany.company.logo,
        currency: userCompany.company.currency,
      },
      role: userCompany.role,
      permissions: userCompany.permissions,
    });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
