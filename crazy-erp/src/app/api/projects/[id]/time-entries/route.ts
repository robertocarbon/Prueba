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

  const timeEntries = await prisma.timeEntry.findMany({
    where: { projectId: id },
    include: {
      person: { select: { id: true, firstName: true, lastName: true } },
      phase: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return successResponse(timeEntries);
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
    const { personId, phaseId, date, hours, days, cost, notes } = body;

    if (!personId || !date) return errorResponse('Persona y fecha son obligatorios', 400);

    const entry = await prisma.timeEntry.create({
      data: {
        projectId: id,
        phaseId: phaseId || null,
        personId,
        date: new Date(date),
        hours: hours || 0,
        days: days || 0,
        cost: cost || 0,
        notes: notes || null,
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
        phase: { select: { id: true, name: true } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'TimeEntry',
      entityId: entry.id,
      newData: entry,
      ipAddress,
      userAgent,
    });

    return successResponse(entry, 201);
  } catch (error) {
    console.error('Error creating time entry:', error);
    return errorResponse('Error al crear el registro de tiempo', 500);
  }
}
