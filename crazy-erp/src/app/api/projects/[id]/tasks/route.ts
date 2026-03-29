import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  createAuditLog,
  getClientInfo,
  getPaginationParams,
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

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const status = searchParams.get('status') || '';

  const where: Record<string, unknown> = { projectId: id };
  if (status && status !== 'all') where.status = status;

  const [tasks, total] = await Promise.all([
    prisma.projectTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, photo: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { order: 'asc' },
      skip,
      take: limit,
    }),
    prisma.projectTask.count({ where }),
  ]);

  return successResponse({
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
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
    const { title, description, phaseId, assigneeId, status, priority, dueDate, checklist, order } = body;

    if (!title) return errorResponse('El título de la tarea es obligatorio', 400);

    const task = await prisma.projectTask.create({
      data: {
        projectId: id,
        phaseId: phaseId || null,
        assigneeId: assigneeId || null,
        title,
        description: description || null,
        status: status || 'pendiente',
        priority: priority || 'media',
        dueDate: dueDate ? new Date(dueDate) : null,
        checklist: checklist ? JSON.stringify(checklist) : null,
        order: order ?? 0,
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
      action: 'CREATE',
      entity: 'ProjectTask',
      entityId: task.id,
      newData: task,
      ipAddress,
      userAgent,
    });

    return successResponse(task, 201);
  } catch (error) {
    console.error('Error creating task:', error);
    return errorResponse('Error al crear la tarea', 500);
  }
}
