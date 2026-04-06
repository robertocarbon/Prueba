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

  const comments = await prisma.projectComment.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(comments);
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
    const { content } = body;

    if (!content) return errorResponse('El contenido es obligatorio', 400);

    const comment = await prisma.projectComment.create({
      data: {
        projectId: id,
        authorId: user.userId,
        content,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'ProjectComment',
      entityId: comment.id,
      newData: comment,
      ipAddress,
      userAgent,
    });

    return successResponse(comment, 201);
  } catch (error) {
    console.error('Error creating comment:', error);
    return errorResponse('Error al crear el comentario', 500);
  }
}
