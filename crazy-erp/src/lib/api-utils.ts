import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth';
import prisma from './prisma';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
  companyId?: string;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookie = req.cookies.get('token');
  return cookie?.value || null;
}

export async function authenticateRequest(req: NextRequest): Promise<{ user: TokenPayload; companyId: string | null } | NextResponse> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  // Check session is active
  const session = await prisma.session.findFirst({
    where: { token, active: true, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
  }

  const companyId = req.headers.get('x-company-id');

  return { user: payload, companyId };
}

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function createAuditLog(params: {
  userId?: string;
  companyId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      companyId: params.companyId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldData: params.oldData ? JSON.stringify(params.oldData) : null,
      newData: params.newData ? JSON.stringify(params.newData) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export function getClientInfo(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
