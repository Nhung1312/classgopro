import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BankAccountInfo,
  PaymentOrder,
  UserSubscription,
} from '../types';
import { ENABLE_TRIAL_LIMIT, TRIAL_DURATION_DAYS } from '../config/subscriptionConfig';

export { ENABLE_TRIAL_LIMIT, TRIAL_DURATION_DAYS };

export const ADMIN_EMAIL = 'nhung.ngo.u@gmail.com';

export const BANK_CONFIG: BankAccountInfo = {
  bankName: 'MB BANK (Ngân hàng TMCP Quân Đội)',
  bankCode: 'MB',
  accountNumber: '0001448905209',
  accountHolder: 'LE DINH TUAN',
  proPrice: 169000,
  proDurationDays: 365,
  trialDays: TRIAL_DURATION_DAYS,
};

/**
 * Generate a unique Order ID in format: CLASSGO-ABC12345
 */
export function generateOrderId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestampSuffix = Date.now().toString(36).slice(-3).toUpperCase();
  return `CLASSGO-${rand}${timestampSuffix}`;
}

/**
 * Generate VietQR image URL for bank transfer
 */
export function getVietQRUrl(orderId: string, amount = BANK_CONFIG.proPrice): string {
  const accountNameEncoded = encodeURIComponent(BANK_CONFIG.accountHolder);
  const memoEncoded = encodeURIComponent(orderId);
  return `https://img.vietqr.io/image/${BANK_CONFIG.bankCode}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${amount}&addInfo=${memoEncoded}&accountName=${accountNameEncoded}`;
}

/**
 * Calculate expiration date for Pro package renewal:
 * - If current Pro is still active (proEndAt > now): adds 365 days to proEndAt.
 * - If current Pro is expired or never active: adds 365 days from today.
 */
export function calculateProRenewalEndAt(
  currentProEndAt?: string,
  daysToAdd = BANK_CONFIG.proDurationDays
): string {
  const msToAdd = daysToAdd * 24 * 60 * 60 * 1000;
  if (currentProEndAt) {
    const currentExpiry = new Date(currentProEndAt).getTime();
    const now = Date.now();
    if (!isNaN(currentExpiry) && currentExpiry > now) {
      // Still active: add 365 days to existing expiry date
      return new Date(currentExpiry + msToAdd).toISOString();
    }
  }
  // Expired or new: add 365 days from now
  return new Date(Date.now() + msToAdd).toISOString();
}

/**
 * Create a new payment order with PENDING status in Firestore
 */
export async function createPaymentOrder(
  userId: string,
  userEmail: string
): Promise<PaymentOrder> {
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  const newOrder: PaymentOrder = {
    orderId,
    userId,
    userEmail,
    amount: BANK_CONFIG.proPrice,
    currency: 'VND',
    status: 'PENDING',
    createdAt: now,
    paymentMethod: 'VIETQR_BANK_TRANSFER',
    subscriptionDays: BANK_CONFIG.proDurationDays,
    note: `Nâng cấp CLASSGO PRO 12 tháng - ${orderId}`,
  };

  const orderDocRef = doc(db, 'orders', orderId);
  await setDoc(orderDocRef, newOrder);

  return newOrder;
}

/**
 * Real-time listener for an order's status updates
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: PaymentOrder | null) => void,
  onError?: (err: any) => void
): () => void {
  const orderDocRef = doc(db, 'orders', orderId);
  return onSnapshot(
    orderDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as PaymentOrder);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error(`Error listening to order ${orderId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all orders created by a specific user
 */
export async function getUserOrders(userId: string): Promise<PaymentOrder[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const orders: PaymentOrder[] = [];
    snapshot.forEach((d) => {
      orders.push(d.data() as PaymentOrder);
    });
    // Sort newest first
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get user orders:', err);
    return [];
  }
}

/**
 * Admin: Fetch all pending orders for verification
 */
export async function getPendingOrdersForAdmin(): Promise<PaymentOrder[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'PENDING'));
    const snapshot = await getDocs(q);
    const orders: PaymentOrder[] = [];
    snapshot.forEach((d) => {
      orders.push(d.data() as PaymentOrder);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get pending orders for admin:', err);
    return [];
  }
}

/**
 * Verify and Activate Order with Anti-Duplicate Transaction Check.
 * Can be called by the Admin verification panel or by a verified webhook.
 */
export async function verifyAndActivateOrder(
  orderId: string,
  transactionId: string,
  operatorEmail?: string
): Promise<{ success: boolean; message: string }> {
  const cleanTxId = transactionId.trim().toUpperCase();
  if (!cleanTxId) {
    throw new Error('Vui lòng nhập mã giao dịch ngân hàng hợp lệ!');
  }

  // 1. Anti-Duplicate Check: A transactionId can only ever be used ONCE
  const txDocRef = doc(db, 'processed_transactions', cleanTxId);
  const txSnap = await getDoc(txDocRef);
  if (txSnap.exists()) {
    throw new Error(`Mã giao dịch ${cleanTxId} đã được hệ thống xử lý trước đó! Không thể kích hoạt lại.`);
  }

  // 2. Fetch Order
  const orderDocRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDocRef);
  if (!orderSnap.exists()) {
    throw new Error(`Không tìm thấy đơn hàng mã ${orderId}`);
  }

  const order = orderSnap.data() as PaymentOrder;
  if (order.status === 'PAID') {
    return { success: true, message: 'Đơn hàng này đã được kích hoạt trước đó.' };
  }

  const now = new Date().toISOString();

  // 3. Mark Order as PAID
  await updateDoc(orderDocRef, {
    status: 'PAID',
    paidAt: now,
    transactionId: cleanTxId,
    verifiedBy: operatorEmail || 'SYSTEM_VERIFICATION',
  });

  // 4. Update User's Subscription in users/{userId}
  const userDocRef = doc(db, 'users', order.userId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.data() || {};
  const currentSub: UserSubscription | undefined = userData.subscription;

  const newProEndAt = calculateProRenewalEndAt(currentSub?.proEndAt, BANK_CONFIG.proDurationDays);

  const updatedSubscription: UserSubscription = {
    status: 'ACTIVE',
    trialStartAt: currentSub?.trialStartAt || now,
    trialEndAt: currentSub?.trialEndAt || now,
    proStartAt: currentSub?.proStartAt || now,
    proEndAt: newProEndAt,
    updatedAt: now,
    lastOrderId: orderId,
  };

  await setDoc(
    userDocRef,
    {
      subscription: updatedSubscription,
      updatedAt: now,
    },
    { merge: true }
  );

  // 5. Lock the transactionId in processed_transactions so it cannot be reused
  await setDoc(txDocRef, {
    transactionId: cleanTxId,
    orderId,
    userId: order.userId,
    userEmail: order.userEmail,
    amount: order.amount,
    processedAt: now,
    processedBy: operatorEmail || 'SYSTEM_VERIFICATION',
  });

  return {
    success: true,
    message: `Kích hoạt CLASSGO PRO thành công cho tài khoản ${order.userEmail}! Hạn dùng đến: ${new Date(newProEndAt).toLocaleDateString('vi-VN')}`,
  };
}

/**
 * Interface ready for automated Webhook from banking services (e.g. Casso, SePAY, VietQR Webhook)
 */
export interface BankWebhookTransaction {
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  code?: string;
  transactionContent: string;
  referenceNumber: string;
  description: string;
}

/**
 * Service function to process an incoming bank transaction (for automated integration)
 */
export async function processAutomatedBankTransaction(
  tx: BankWebhookTransaction
): Promise<{ processed: boolean; reason?: string }> {
  // Check if amount matches 169.000 VND
  if (tx.amountIn < BANK_CONFIG.proPrice) {
    return { processed: false, reason: `Số tiền (${tx.amountIn}) nhỏ hơn giá gói (${BANK_CONFIG.proPrice})` };
  }

  // Extract orderId from transfer memo (e.g. "CLASSGO-ABC12345")
  const match = tx.transactionContent.match(/CLASSGO-[A-Z0-9]+/i);
  if (!match) {
    return { processed: false, reason: 'Nội dung chuyển khoản không chứa mã đơn hàng CLASSGO-' };
  }

  const orderId = match[0].toUpperCase();
  const transactionId = tx.referenceNumber || tx.code || `AUTO-${Date.now()}`;

  try {
    await verifyAndActivateOrder(orderId, transactionId, 'AUTOMATED_WEBHOOK');
    return { processed: true };
  } catch (err: any) {
    return { processed: false, reason: err.message };
  }
}
