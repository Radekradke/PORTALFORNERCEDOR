import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { getMailProvider } from "@/lib/mail";
import type { Actor } from "@/modules/auth-access/domain/actor";

export class NotificationServiceError extends Error {}

type TxClient = Prisma.TransactionClient;

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  supplierId?: string | null;
}

/**
 * RF-116: cria a notificação central. Sempre chamada dentro da mesma
 * transação do evento de negócio que a originou (mesma linha de recordAudit)
 * — nunca existe um estado "ação aconteceu mas o aviso não foi criado".
 */
export async function createNotification(client: TxClient, input: CreateNotificationInput) {
  return client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      supplierId: input.supplierId ?? null,
    },
  });
}

/**
 * RF-116/RF-117: cria uma notificação para cada usuário ativo do fornecedor
 * (a organização, não uma pessoa específica) — usado nos eventos em que o
 * destinatário natural é "o fornecedor", não um indivíduo. Continua sem
 * ambiguidade: todos os usuários ativos da mesma empresa recebem o mesmo
 * evento, o mesmo padrão de isolamento por organização usado no resto do
 * portal (nunca "escolhe" um entre vários). Retorna os IDs para o envio de
 * e-mail (feito fora da transação, ver `sendNotificationEmail`).
 */
export async function notifySupplierUsers(
  client: TxClient,
  supplierId: string,
  input: Omit<CreateNotificationInput, "userId" | "supplierId">,
): Promise<string[]> {
  const users = await client.user.findMany({
    where: { supplierId, status: "ACTIVE" },
    select: { id: true },
  });
  for (const user of users) {
    await createNotification(client, { ...input, userId: user.id, supplierId });
  }
  return users.map((u) => u.id);
}

/** Envia o e-mail transacional para uma lista de usuários — best-effort, fora da transação. */
export async function sendNotificationEmailToMany(userIds: string[], title: string, message: string, link: string) {
  await Promise.all(userIds.map((userId) => sendNotificationEmail(userId, title, message, link)));
}

/**
 * RF-117: e-mail transacional do evento — sempre chamado DEPOIS que a
 * transação principal já foi confirmada (mesmo padrão de
 * password-reset-service.ts: e-mail é I/O externo, não faz parte da
 * atomicidade da mutação). Falha de e-mail nunca desfaz a ação nem
 * remove o alerta já gravado no portal (seção 10: "falha de e-mail não
 * desfaz a ação; o sistema... mantém o alerta no portal").
 */
export async function sendNotificationEmail(userId: string, title: string, message: string, link: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;
    const env = getEnv();
    const url = `${env.APP_URL}${link}`;
    await getMailProvider().send({
      to: user.email,
      subject: title,
      text: `${message}\n\n${url}`,
      html: `<p>${message}</p><p><a href="${url}">${url}</a></p>`,
    });
  } catch {
    // Intencional: e-mail é best-effort. O registro central (Notification)
    // já existe e é a fonte oficial (RN-022).
  }
}

// -----------------------------------------------------------------------------
// Consulta e leitura — sempre escopada ao próprio usuário (RF-116, EXT-08).
// Não passa por authorize(): é um recurso inerentemente "meu", mesmo padrão
// de Session/PasswordResetToken — a query em si garante o isolamento.
// -----------------------------------------------------------------------------

export interface ListNotificationsFilters {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listNotifications(actor: Actor, filters: ListNotificationsFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 30;

  const where: Prisma.NotificationWhereInput = {
    userId: actor.id,
    ...(filters.unreadOnly ? { readAt: null } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getUnreadNotificationCount(actor: Actor): Promise<number> {
  return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
}

export async function markNotificationRead(actor: Actor, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotificationServiceError("Notificação não encontrada.");
  // RN-022/CA-03: nunca deixa marcar como lida a notificação de outra pessoa
  // — "apagar" o evento de negócio nunca é permitido, mas isso aqui é ler,
  // e mesmo ler só vale para o dono.
  if (notification.userId !== actor.id) throw new NotificationServiceError("Notificação não encontrada.");

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }
}

export async function markAllNotificationsRead(actor: Actor) {
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
}
