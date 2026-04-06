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

const DEFAULT_PHASES = [
  { name: 'Diseño', type: 'diseño', order: 1 },
  { name: 'Decorado', type: 'decorado', order: 2 },
  { name: 'Construcción', type: 'construcción', order: 3 },
  { name: 'Envío', type: 'envío', order: 4 },
  { name: 'Montaje', type: 'montaje', order: 5 },
  { name: 'Desmontaje', type: 'desmontaje', order: 6 },
];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(searchParams);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const clientId = searchParams.get('clientId') || '';

  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  if (priority && priority !== 'all') {
    where.priority = priority;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        phases: { select: { id: true, status: true, progress: true } },
        tasks: { select: { id: true, status: true } },
        assignments: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  const projectsWithProgress = projects.map((p) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.status === 'completada').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { ...p, progress, taskCount: totalTasks, completedTaskCount: completedTasks, teamCount: p.assignments.length };
  });

  return successResponse({
    projects: projectsWithProgress,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const { user, companyId } = auth;
  if (!companyId) return errorResponse('Empresa no seleccionada', 400);

  try {
    const body = await req.json();
    const { name, description, clientId, priority, location, designStart, designEnd, buildStart, buildEnd, mountStart, mountEnd, dismountStart, dismountEnd } = body;

    if (!name) {
      return errorResponse('El nombre del proyecto es obligatorio', 400);
    }

    // Get company for auto-code
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return errorResponse('Empresa no encontrada', 404);

    const year = new Date().getFullYear();
    const num = String(company.nextProjectNum).padStart(3, '0');
    const code = `${company.prefixProject}-${year}-${num}`;

    const project = await prisma.project.create({
      data: {
        companyId,
        clientId: clientId || null,
        code,
        name,
        description: description || null,
        status: 'borrador',
        priority: priority || 'media',
        location: location || null,
        designStart: designStart ? new Date(designStart) : null,
        designEnd: designEnd ? new Date(designEnd) : null,
        buildStart: buildStart ? new Date(buildStart) : null,
        buildEnd: buildEnd ? new Date(buildEnd) : null,
        mountStart: mountStart ? new Date(mountStart) : null,
        mountEnd: mountEnd ? new Date(mountEnd) : null,
        dismountStart: dismountStart ? new Date(dismountStart) : null,
        dismountEnd: dismountEnd ? new Date(dismountEnd) : null,
      },
    });

    // Auto-create default phases
    await prisma.projectPhase.createMany({
      data: DEFAULT_PHASES.map((phase) => ({
        projectId: project.id,
        name: phase.name,
        type: phase.type,
        order: phase.order,
        status: 'pendiente',
        progress: 0,
      })),
    });

    // Increment company nextProjectNum
    await prisma.company.update({
      where: { id: companyId },
      data: { nextProjectNum: company.nextProjectNum + 1 },
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true } },
        phases: { orderBy: { order: 'asc' } },
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: user.userId,
      companyId,
      action: 'CREATE',
      entity: 'Project',
      entityId: project.id,
      newData: fullProject,
      ipAddress,
      userAgent,
    });

    return successResponse(fullProject, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return errorResponse('Error al crear el proyecto', 500);
  }
}
