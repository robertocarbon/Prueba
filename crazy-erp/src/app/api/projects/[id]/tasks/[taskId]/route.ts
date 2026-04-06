import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
} from '@/lib/api-utils';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id, taskId } = await params;

  try {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, projectId: id },
    });
    if (!task) return errorResponse('Tarea no encontrada', 404);

    const body = await req.json();
    const { title, description, phaseId, assigneeId, status, priority, dueDate, checklist, order } = body;

    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(phaseId !== undefined && { phaseId: phaseId || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(checklist !== undefined && { checklist: checklist ? JSON.stringify(checklist) : null }),
        ...(order !== undefined && { order }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, photo: true } },
        phase: { select: { id: true, name: true } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'UPDATE',
      entity: 'ProjectTask',
      entityId: taskId,
      oldData: task,
      newData: updated,
      ipAddress,
      userAgent,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('Error updating task:', error);
    return errorResponse('Error al actualizar la tarea', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { id, taskId } = await params;

  try {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, projectId: id },
    });
    if (!task) return errorResponse('Tarea no encontrada', 404);

    await prisma.projectTask.delete({ where: { id: taskId } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'DELETE',
      entity: 'ProjectTask',
      entityId: taskId,
      oldData: task,
      ipAddress,
      userAgent,
    });

    return successResponse({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return errorResponse('Error al eliminar la tarea', 500);
  }
}
