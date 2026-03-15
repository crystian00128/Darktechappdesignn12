/**
 * In-App Notification Dispatcher
 * Dispatches CustomEvents that the NotificationBell component listens for.
 * These are complementary to push notifications — they work when the app is open.
 * 
 * IMPORTANT: Every notification is targeted to a specific user via `targetUser`.
 * The NotificationBell component filters events, so only the matching user's bell receives it.
 * If no targetUser is specified, it falls back to the currently logged-in user.
 */

export type NotificationType =
  | "chat_message"
  | "new_order"
  | "order_status"
  | "pix_confirmed"
  | "pix_generated"
  | "incoming_call"
  | "code_generated"
  | "user_registered"
  | "withdrawal_request"
  | "withdrawal_completed"
  | "delivery_update"
  | "general";

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  targetUser?: string; // "role:username" or just "username" — who should receive this notification
}

/**
 * Get the current user's key for targeting notifications.
 * Returns "role:username" format.
 */
function getCurrentUserKey(): string {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (u.username && u.role) return `${u.role}:${u.username}`;
    if (u.username) return u.username;
  } catch {}
  return "anonymous";
}

/**
 * Dispatch an in-app notification event.
 * The NotificationBell component in the sidebar header will pick this up,
 * but ONLY if the targetUser matches the bell's user.
 */
export function dispatchNotification(payload: NotificationPayload) {
  const event = new CustomEvent("app-notification", {
    detail: {
      title: payload.title,
      body: payload.body,
      type: payload.type,
      targetUser: payload.targetUser || getCurrentUserKey(),
    },
  });
  window.dispatchEvent(event);
}

/**
 * Quick helpers for common notification types
 * All helpers now accept an optional targetUser parameter.
 * If not provided, the notification goes to the currently logged-in user.
 */
export function notifyNewMessage(senderName: string, preview: string, targetUser?: string) {
  dispatchNotification({
    title: `${senderName}`,
    body: preview.length > 60 ? preview.slice(0, 60) + "..." : preview,
    type: "chat_message",
    targetUser,
  });
}

export function notifyNewOrder(clientName: string, total: number, targetUser?: string) {
  dispatchNotification({
    title: "Novo Pedido!",
    body: `${clientName} fez um pedido de R$ ${total.toFixed(2)}`,
    type: "new_order",
    targetUser,
  });
}

export function notifyOrderStatus(status: string, orderId: string, targetUser?: string) {
  const labels: Record<string, string> = {
    accepted: "Pedido aceito",
    preparing: "Pedido em preparo",
    delivering: "Atribuído para entrega",
    driver_accepted: "Motorista aceitou a entrega",
    collected: "Pedido coletado pelo motorista",
    on_the_way: "Motorista a caminho",
    delivered: "Entrega concluída",
    cancelled: "Pedido cancelado",
  };
  dispatchNotification({
    title: labels[status] || `Pedido: ${status}`,
    body: `Pedido #${orderId.slice(-6)} atualizado`,
    type: "order_status",
    targetUser,
  });
}

export function notifyPixConfirmed(amount: number, targetUser?: string) {
  dispatchNotification({
    title: "PIX Confirmado!",
    body: `Pagamento de R$ ${amount.toFixed(2)} recebido`,
    type: "pix_confirmed",
    targetUser,
  });
}

export function notifyPixGenerated(amount: number, targetUser?: string) {
  dispatchNotification({
    title: "PIX Gerado",
    body: `QR Code de R$ ${amount.toFixed(2)} criado`,
    type: "pix_generated",
    targetUser,
  });
}

export function notifyCodeGenerated(code: string, targetUser?: string) {
  dispatchNotification({
    title: "Codigo Gerado",
    body: `Novo codigo: ${code}`,
    type: "code_generated",
    targetUser,
  });
}

export function notifyUserRegistered(name: string, role: string, targetUser?: string) {
  dispatchNotification({
    title: "Novo Usuario",
    body: `${name} registrou-se como ${role}`,
    type: "user_registered",
    targetUser,
  });
}

export function notifyIncomingCall(callerName: string, type: "voice" | "video", targetUser?: string) {
  dispatchNotification({
    title: type === "video" ? "Videochamada" : "Ligacao",
    body: `${callerName} esta ligando...`,
    type: "incoming_call",
    targetUser,
  });
}

export function notifyWithdrawalRequest(vendorName: string, amount: number, targetUser?: string) {
  dispatchNotification({
    title: "Solicitacao de Saque",
    body: `${vendorName} solicitou saque de R$ ${amount.toFixed(2)}`,
    type: "withdrawal_request",
    targetUser,
  });
}

export function notifyWithdrawalCompleted(amount: number, targetUser?: string) {
  dispatchNotification({
    title: "Saque Concluido!",
    body: `Transferencia de R$ ${amount.toFixed(2)} realizada com sucesso`,
    type: "withdrawal_completed",
    targetUser,
  });
}
