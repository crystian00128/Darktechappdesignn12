/**
 * In-App Notification Dispatcher
 * Dispatches CustomEvents that the NotificationBell component listens for.
 * These are complementary to push notifications — they work when the app is open.
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
  | "general";

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
}

/**
 * Dispatch an in-app notification event.
 * The NotificationBell component in the sidebar header will pick this up.
 */
export function dispatchNotification(payload: NotificationPayload) {
  const event = new CustomEvent("app-notification", {
    detail: {
      title: payload.title,
      body: payload.body,
      type: payload.type,
    },
  });
  window.dispatchEvent(event);
}

/**
 * Quick helpers for common notification types
 */
export function notifyNewMessage(senderName: string, preview: string) {
  dispatchNotification({
    title: `${senderName}`,
    body: preview.length > 60 ? preview.slice(0, 60) + "..." : preview,
    type: "chat_message",
  });
}

export function notifyNewOrder(clientName: string, total: number) {
  dispatchNotification({
    title: "Novo Pedido!",
    body: `${clientName} fez um pedido de R$ ${total.toFixed(2)}`,
    type: "new_order",
  });
}

export function notifyOrderStatus(status: string, orderId: string) {
  const labels: Record<string, string> = {
    accepted: "Pedido aceito",
    preparing: "Pedido em preparo",
    delivering: "Saiu para entrega",
    delivered: "Pedido entregue",
    cancelled: "Pedido cancelado",
  };
  dispatchNotification({
    title: labels[status] || `Pedido: ${status}`,
    body: `Pedido #${orderId.slice(-6)} atualizado`,
    type: "order_status",
  });
}

export function notifyPixConfirmed(amount: number) {
  dispatchNotification({
    title: "PIX Confirmado!",
    body: `Pagamento de R$ ${amount.toFixed(2)} recebido`,
    type: "pix_confirmed",
  });
}

export function notifyPixGenerated(amount: number) {
  dispatchNotification({
    title: "PIX Gerado",
    body: `QR Code de R$ ${amount.toFixed(2)} criado`,
    type: "pix_generated",
  });
}

export function notifyCodeGenerated(code: string) {
  dispatchNotification({
    title: "Codigo Gerado",
    body: `Novo codigo: ${code}`,
    type: "code_generated",
  });
}

export function notifyUserRegistered(name: string, role: string) {
  dispatchNotification({
    title: "Novo Usuario",
    body: `${name} registrou-se como ${role}`,
    type: "user_registered",
  });
}

export function notifyIncomingCall(callerName: string, type: "voice" | "video") {
  dispatchNotification({
    title: type === "video" ? "Videochamada" : "Ligacao",
    body: `${callerName} esta ligando...`,
    type: "incoming_call",
  });
}
