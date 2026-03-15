import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-42377006`;

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  // If caller provided a signal, link it to our internal controller
  if (options.signal) {
    // If already aborted, bail out immediately without throwing
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      return { success: false, _aborted: true };
    }
    options.signal.addEventListener('abort', () => controller.abort('Caller aborted'), { once: true });
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  } catch (err: any) {
    // Silently swallow AbortErrors — these are expected from timeouts,
    // component unmounts, and rapid polling cancellations
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      return { success: false, _aborted: true };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== INICIALIZAÇÃO ====================
export async function initDatabase() {
  return fetchAPI('/init', { method: 'POST' });
}

export async function resetDatabase() {
  return fetchAPI('/reset', { method: 'POST' });
}

// ==================== LOGIN ====================
export async function loginStep1(username: string) {
  return fetchAPI('/login/step1', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function loginStep2(username: string, pin: string) {
  return fetchAPI('/login/step2', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
}

// ==================== CÓDIGOS DE CONVITE ====================
export async function generateInviteCode(type: 'vendedor' | 'cliente' | 'motorista', generatedBy: string) {
  return fetchAPI('/codes/generate', {
    method: 'POST',
    body: JSON.stringify({ type, generatedBy }),
  });
}

export async function validateInviteCode(code: string) {
  return fetchAPI('/codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getInviteCodes(type: 'vendedor' | 'cliente' | 'motorista') {
  return fetchAPI(`/codes/${type}`);
}

// ==================== REGISTRO ====================
export async function registerUser(userData: {
  username: string;
  pin: string;
  name: string;
  role: 'admin' | 'vendedor' | 'cliente' | 'motorista';
  inviteCode?: string;
  photo?: string;
  faceData?: string;
  whatsapp?: string;
}) {
  return fetchAPI('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// ==================== FACE RECOGNITION ====================
export async function getUserFace(username: string) {
  return fetchAPI(`/users/${username}/face`);
}

export async function loginFaceVerify(username: string) {
  return fetchAPI('/login/face-verify', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

// ==================== USUÁRIOS ====================
// Verificar disponibilidade de username
export async function checkUsername(username: string) {
  return fetchAPI(`/users/check/${username}`);
}

export async function getUsers(role: 'admin' | 'vendedor' | 'cliente' | 'motorista') {
  return fetchAPI(`/users/${role}`);
}

// Buscar usuários criados por um usuário específico
export async function getUsersCreatedBy(username: string) {
  return fetchAPI(`/users/created-by/${username}`);
}

// Buscar quem criou um usuário específico
export async function getUserCreator(username: string) {
  return fetchAPI(`/users/${username}/creator`);
}

// Reparar vínculos entre usuários
export async function repairLinks() {
  return fetchAPI('/repair-links', { method: 'POST' });
}

// Buscar todos os vendedores vinculados a um cliente (com status online)
export async function getLinkedVendors(username: string) {
  return fetchAPI(`/users/${username}/linked-vendors`);
}

// Vincular um usuário existente a um vendedor via código de convite
export async function linkUser(username: string, inviteCode: string) {
  return fetchAPI('/link-user', {
    method: 'POST',
    body: JSON.stringify({ username, inviteCode }),
  });
}

// ==================== CHAT ====================
export async function sendMessage(
  from: string, to: string, text: string, type = "text",
  extra?: { mediaId?: string; audioDuration?: number }
) {
  return fetchAPI('/chat/send', {
    method: 'POST',
    body: JSON.stringify({ from, to, text, type, ...extra }),
  });
}

// Upload media (base64) to server, returns mediaId
export async function uploadMedia(data: string): Promise<string> {
  const res = await fetchAPI('/chat/media', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  return res.id;
}

// Download media by ID, returns base64 string
export async function getMedia(id: string): Promise<string | null> {
  try {
    const res = await fetchAPI(`/chat/media/${id}`);
    return res.data || null;
  } catch { return null; }
}

export async function getMessages(user1: string, user2: string) {
  return fetchAPI(`/chat/${user1}/${user2}`);
}

export async function markMessagesRead(user1: string, user2: string, reader: string) {
  return fetchAPI('/chat/read', {
    method: 'POST',
    body: JSON.stringify({ user1, user2, reader }),
  });
}

export async function clearChat(user1: string, user2: string, requester: string) {
  return fetchAPI('/chat/clear', {
    method: 'POST',
    body: JSON.stringify({ user1, user2, requester }),
  });
}

export async function getChatLastMessages(username: string, contacts: string[]) {
  return fetchAPI('/chat/last-messages', {
    method: 'POST',
    body: JSON.stringify({ username, contacts }),
  });
}

// ==================== TYPING INDICATORS ====================
export async function sendTyping(from: string, to: string, isTyping: boolean) {
  return fetchAPI('/chat/typing', {
    method: 'POST',
    body: JSON.stringify({ from, to, isTyping }),
  });
}

export async function checkTyping(username: string) {
  return fetchAPI('/chat/typing/check', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

// ==================== UNREAD COUNTS ====================
export async function markChatRead(username: string, chatWith: string) {
  return fetchAPI('/chat/mark-read', {
    method: 'POST',
    body: JSON.stringify({ username, chatWith }),
  });
}

export async function getUnreadCounts(username: string, contacts: string[]) {
  return fetchAPI('/chat/unread-counts', {
    method: 'POST',
    body: JSON.stringify({ username, contacts }),
  });
}

// ==================== CHAT PUSH NOTIFICATIONS ====================
export async function notifyNewMessage(to: string, fromName: string, text: string, type: string = "text") {
  return fetchAPI('/chat/notify', {
    method: 'POST',
    body: JSON.stringify({ to, fromName, text, type }),
  });
}

// ==================== PRODUTOS ====================
export async function createProduct(vendorUsername: string, data: { name: string; description?: string; price: number; category?: string }) {
  return fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify({ vendorUsername, ...data }),
  });
}

export async function getProducts(vendorUsername: string) {
  return fetchAPI(`/products/${vendorUsername}`);
}

export async function updateProduct(productId: string, data: any) {
  return fetchAPI(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(vendorUsername: string, productId: string) {
  return fetchAPI(`/products/${vendorUsername}/${productId}`, {
    method: 'DELETE',
  });
}

// ==================== PEDIDOS ====================
export async function getOrderFeePreview(vendorUsername: string, total: number) {
  return fetchAPI('/orders/fee-preview', { method: 'POST', body: JSON.stringify({ vendorUsername, total }) });
}

export async function createOrder(data: { clientUsername: string; vendorUsername: string; items: any[]; total: number; deliveryAddress?: string; paymentSource?: string }) {
  return fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVendorOrders(username: string) {
  return fetchAPI(`/orders/vendor/${username}`);
}

export async function getClientOrders(username: string) {
  return fetchAPI(`/orders/client/${username}`);
}

export async function getDriverOrders(username: string) {
  return fetchAPI(`/orders/driver/${username}`);
}

export async function updateOrderStatus(orderId: string, data: { status: string; vendorUsername: string; clientUsername: string; driverUsername?: string; driverCommission?: { fixa: number; perc: number; total: number; orderTotal: number } }) {
  return fetchAPI(`/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==================== STATUS ONLINE/OFFLINE ====================
export async function setUserStatus(username: string, online: boolean) {
  return fetchAPI('/status', {
    method: 'POST',
    body: JSON.stringify({ username, online }),
  });
}

export async function getUserStatus(username: string) {
  return fetchAPI(`/status/${username}`);
}

// ==================== MÉTRICAS ====================
export async function getMetrics(username: string) {
  return fetchAPI(`/metrics/${username}`);
}

// ==================== LIMPEZA ====================
export async function cleanup() {
  return fetchAPI('/cleanup', { method: 'POST' });
}

// ==================== HIERARQUIA ====================
export async function getHierarchy() {
  return fetchAPI('/hierarchy');
}

// ==================== DELETAR VENDEDOR EM CASCATA ====================
export async function deleteVendorCascade(username: string) {
  return fetchAPI(`/vendor/${username}`, { method: 'DELETE' });
}

// ==================== DIAGNÓSTICO DE VÍNCULO ====================
export async function debugLink(username: string) {
  return fetchAPI(`/debug/link/${username}`);
}

// ==================== PIXWAVE / DEPIX ====================
export async function savePixwaveConfig(apiKey: string) {
  return fetchAPI('/pixwave/config', { method: 'POST', body: JSON.stringify({ apiKey }) });
}

export async function getPixwaveConfig() {
  return fetchAPI('/pixwave/config');
}

export async function disconnectPixwave() {
  return fetchAPI('/pixwave/config', { method: 'DELETE' });
}

export async function createPixwaveInvoice(data: {
  description: string;
  price: number;
  externalId?: string;
  redirectTo?: string;
  metadata?: Record<string, unknown>;
}) {
  return fetchAPI('/pixwave/invoice', { method: 'POST', body: JSON.stringify(data) });
}

export async function getPixwaveInvoice(invoiceId: string) {
  return fetchAPI(`/pixwave/invoice/${invoiceId}`);
}

export async function listPixwaveInvoices() {
  return fetchAPI('/pixwave/invoices');
}

export async function getPixwaveDashboard() {
  return fetchAPI('/pixwave/dashboard');
}

// ==================== DIRECT PIX SALES ====================
export async function recordDirectPixSale(data: { vendorUsername: string; amount: number; invoiceId: string; description?: string }) {
  return fetchAPI('/pix-direct-sale', { method: 'POST', body: JSON.stringify(data) });
}

// ==================== VENDOR COMMISSION RATE ====================
export async function getVendorCommission(username: string) {
  return fetchAPI(`/vendor-commission/${username}`);
}

export async function setVendorCommission(username: string, rate: number) {
  return fetchAPI(`/vendor-commission/${username}`, { method: 'PUT', body: JSON.stringify({ rate }) });
}

// ==================== DRIVER COMMISSION CONFIG ====================
export async function getDriverCommission(vendorUsername: string, driverUsername: string) {
  return fetchAPI(`/driver-commission/${vendorUsername}/${driverUsername}`);
}

export async function setDriverCommission(vendorUsername: string, driverUsername: string, taxaFixa: number, taxaPercent: number) {
  return fetchAPI(`/driver-commission/${vendorUsername}/${driverUsername}`, {
    method: 'PUT',
    body: JSON.stringify({ taxaFixa, taxaPercent }),
  });
}

// ==================== CALL SIGNALING ====================
export async function initiateCall(from: string, to: string, type: 'voice' | 'video', fromName: string, fromPhoto?: string) {
  return fetchAPI('/calls/initiate', { method: 'POST', body: JSON.stringify({ from, to, type, fromName, fromPhoto }) });
}

export async function checkIncomingCall(username: string) {
  return fetchAPI(`/calls/incoming/${username}`);
}

export async function answerCall(username: string, callId: string) {
  return fetchAPI('/calls/answer', { method: 'POST', body: JSON.stringify({ username, callId }) });
}

export async function endCall(username: string) {
  return fetchAPI('/calls/end', { method: 'POST', body: JSON.stringify({ username }) });
}

export async function getCallStatus(username: string) {
  return fetchAPI(`/calls/status/${username}`);
}

// ==================== WEBRTC SIGNALING ====================
export async function sendSDP(callId: string, from: string, sdp: RTCSessionDescriptionInit, type: 'offer' | 'answer') {
  return fetchAPI('/calls/webrtc/sdp', {
    method: 'POST',
    body: JSON.stringify({ callId, from, sdp: JSON.stringify(sdp), type }),
  });
}

export async function getSDP(callId: string, type: 'offer' | 'answer') {
  return fetchAPI(`/calls/webrtc/sdp/${callId}/${type}`);
}

export async function sendICECandidate(callId: string, from: string, candidate: RTCIceCandidateInit) {
  return fetchAPI('/calls/webrtc/ice', {
    method: 'POST',
    body: JSON.stringify({ callId, from, candidate: JSON.stringify(candidate) }),
  });
}

export async function getICECandidates(callId: string, from: string) {
  return fetchAPI(`/calls/webrtc/ice/${callId}/${from}`);
}

export async function cleanupWebRTC(callId: string, from?: string, to?: string) {
  return fetchAPI('/calls/webrtc/cleanup', {
    method: 'POST',
    body: JSON.stringify({ callId, from, to }),
  });
}

// ==================== PUSH NOTIFICATIONS ====================
export async function getVapidPublicKey() {
  return fetchAPI('/push/vapid-key');
}

export async function subscribePush(username: string, subscription: PushSubscription) {
  return fetchAPI('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ username, subscription: subscription.toJSON() }),
  });
}

export async function unsubscribePush(username: string, endpoint?: string) {
  return fetchAPI('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ username, endpoint }),
  });
}

export async function sendPushNotification(targetUsername: string, title: string, body: string, url?: string) {
  return fetchAPI('/push/send', {
    method: 'POST',
    body: JSON.stringify({ targetUsername, title, body, url }),
  });
}

export async function getPushStatus(username: string) {
  return fetchAPI(`/push/status/${username}`);
}

// ==================== DETAILED ADMIN METRICS ====================
export async function getAdminDetailedMetrics() {
  return fetchAPI('/metrics/admin/detailed');
}

export async function getAdminDetailedMetricsByPeriod(days: number) {
  return fetchAPI(`/metrics/admin/detailed/${days}`);
}

// ==================== CHAT UNREAD COUNTS ====================
export async function getChatUnreadCounts(username: string) {
  return fetchAPI(`/chat/unread/${username}`);
}

// ==================== USER PRESENCE ====================
export async function sendHeartbeat(username: string) {
  return fetchAPI('/presence/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function checkPresence(usernames: string[]) {
  return fetchAPI('/presence/check', {
    method: 'POST',
    body: JSON.stringify({ usernames }),
  });
}