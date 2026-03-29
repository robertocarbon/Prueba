import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
} from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, companyId, deletedAt: null },
  });
  if (!project) return errorResponse('Proyecto no encontrado', 404);

  const phases = await prisma.projectPhase.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  });

  return successResponse(phases);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    const body = await req.json();
    const { name, type, order, status, progress, startDate, endDate, notes } = body;

    if (!name) return errorResponse('El nombre de la fase es obligatorio', 400);

    const phase = await prisma.projectPhase.create({
      data: {
        projectId: id,
        name,
        type: type || null,
        order: order ?? 0,
        status: status || 'pendiente',
        progress: progress ?? 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'ProjectPhase',
      entityId: phase.id,
      newData: phase,
      ipAddress,
      userAgent,
    });

    return successResponse(phase, 201);
  } catch (error) {
    console.error('Error creating phase:', error);
    return errorResponse('Error al crear la fase', 500);
  }
}
