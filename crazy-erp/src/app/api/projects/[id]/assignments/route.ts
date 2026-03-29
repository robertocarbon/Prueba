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

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: id },
    include: {
      person: { select: { id: true, firstName: true, lastName: true, photo: true, role: true, dailyRate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(assignments);
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
    const { personId, role, dailyRate, startDate, endDate } = body;

    if (!personId) return errorResponse('La persona es obligatoria', 400);

    // Check not already assigned
    const existing = await prisma.projectAssignment.findFirst({
      where: { projectId: id, personId },
    });
    if (existing) return errorResponse('Esta persona ya está asignada al proyecto', 409);

    const assignment = await prisma.projectAssignment.create({
      data: {
        projectId: id,
        personId,
        role: role || null,
        dailyRate: dailyRate || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, photo: true, role: true, dailyRate: true } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'ProjectAssignment',
      entityId: assignment.id,
      newData: assignment,
      ipAddress,
      userAgent,
    });

    return successResponse(assignment, 201);
  } catch (error) {
    console.error('Error creating assignment:', error);
    return errorResponse('Error al asignar persona', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    if (!assignmentId) return errorResponse('ID de asignación requerido', 400);

    const assignment = await prisma.projectAssignment.findFirst({
      where: { id: assignmentId, projectId: id },
    });
    if (!assignment) return errorResponse('Asignación no encontrada', 404);

    await prisma.projectAssignment.delete({ where: { id: assignmentId } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'DELETE',
      entity: 'ProjectAssignment',
      entityId: assignmentId,
      oldData: assignment,
      ipAddress,
      userAgent,
    });

    return successResponse({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return errorResponse('Error al eliminar la asignación', 500);
  }
}
