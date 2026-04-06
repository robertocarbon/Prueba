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
    include: {
      client: true,
      phases: { orderBy: { order: 'asc' } },
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, photo: true } },
          phase: { select: { id: true, name: true } },
        },
        orderBy: { order: 'asc' },
      },
      materials: {
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      photos: { orderBy: { createdAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      comments: { orderBy: { createdAt: 'desc' } },
      timeEntries: {
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
          phase: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      },
      assignments: {
        include: {
          person: { select: { id: true, firstName: true, lastName: true, photo: true, role: true, dailyRate: true } },
        },
      },
    },
  });

  if (!project) return errorResponse('Proyecto no encontrado', 404);

  return successResponse(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const existing = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) return errorResponse('Proyecto no encontrado', 404);

    const body = await req.json();
    const { name, description, clientId, status, priority, location, designStart, designEnd, buildStart, buildEnd, mountStart, mountEnd, dismountStart, dismountEnd } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(location !== undefined && { location: location || null }),
        ...(designStart !== undefined && { designStart: designStart ? new Date(designStart) : null }),
        ...(designEnd !== undefined && { designEnd: designEnd ? new Date(designEnd) : null }),
        ...(buildStart !== undefined && { buildStart: buildStart ? new Date(buildStart) : null }),
        ...(buildEnd !== undefined && { buildEnd: buildEnd ? new Date(buildEnd) : null }),
        ...(mountStart !== undefined && { mountStart: mountStart ? new Date(mountStart) : null }),
        ...(mountEnd !== undefined && { mountEnd: mountEnd ? new Date(mountEnd) : null }),
        ...(dismountStart !== undefined && { dismountStart: dismountStart ? new Date(dismountStart) : null }),
        ...(dismountEnd !== undefined && { dismountEnd: dismountEnd ? new Date(dismountEnd) : null }),
      },
      include: {
        client: { select: { id: true, name: true } },
        phases: { orderBy: { order: 'asc' } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'UPDATE',
      entity: 'Project',
      entityId: id,
      oldData: existing,
      newData: project,
      ipAddress,
      userAgent,
    });

    return successResponse(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return errorResponse('Error al actualizar el proyecto', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id } = await params;

  try {
    const existing = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) return errorResponse('Proyecto no encontrado', 404);

    const now = new Date();

    await prisma.project.update({
      where: { id },
      data: { deletedAt: now },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'DELETE',
      entity: 'Project',
      entityId: id,
      oldData: existing,
      ipAddress,
      userAgent,
    });

    return successResponse({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return errorResponse('Error al eliminar el proyecto', 500);
  }
}
