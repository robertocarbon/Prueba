import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, successResponse, errorResponse, getPaginationParams } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const { skip, limit, page } = getPaginationParams(searchParams);
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = { userId: auth.user.userId };
    if (auth.companyId) where.companyId = auth.companyId;
    if (unreadOnly) where.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: auth.user.userId, read: false } }),
    ]);

    return successResponse({ notifications, total, unreadCount, page, limit });
  } catch {
    return errorResponse('Error interno', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth instanceof Response) return auth;

    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: auth.user.userId, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: auth.user.userId },
        data: { read: true },
      });
    }

    return successResponse({ message: 'Notificaciones actualizadas' });
  } catch {
    return errorResponse('Error interno', 500);
  }
}
