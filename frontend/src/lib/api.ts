const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Silent-refresh infrastructure
//
// The AuthProvider registers a callback here after mount. When any request
// gets a 401, the interceptor calls this once to obtain a new access token,
// retries the original request with it, and only redirects to /login if the
// refresh itself also fails.
// ---------------------------------------------------------------------------

type RefreshFn = () => Promise<string | null>;

let _silentRefresh: RefreshFn | null = null;

/** Called by AuthProvider once on mount so api.ts can trigger token refresh. */
export function registerSilentRefresh(fn: RefreshFn) {
  _silentRefresh = fn;
}

export function unregisterSilentRefresh() {
  _silentRefresh = null;
}

// Prevent concurrent refresh storms: if one refresh is already in flight,
// all other 401s queue behind it and reuse its result.
let _refreshPromise: Promise<string | null> | null = null;

async function attemptSilentRefresh(): Promise<string | null> {
  if (!_silentRefresh) return null;

  if (!_refreshPromise) {
    _refreshPromise = _silentRefresh().finally(() => {
      _refreshPromise = null;
    });
  }

  return _refreshPromise;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

interface RequestOptions extends RequestInit {
  token?: string;
  /** Internal flag — do NOT retry again after a refresh attempt */
  _isRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, _isRetry, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include", // send the HttpOnly refresh-token cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // ── Silent refresh logic ──────────────────────────────────────────────
    if (res.status === 401 && !_isRetry && typeof window !== "undefined") {
      const newToken = await attemptSilentRefresh();

      if (newToken) {
        // Retry the original request exactly once with the fresh access token
        return request<T>(path, { ...options, token: newToken, _isRetry: true });
      }

      // Refresh failed — clear session and redirect
      window.localStorage.removeItem("stationery_erp_session");
      window.location.href = "/login";
    }

    throw new ApiRequestError(res.status, body?.message ?? "Request failed", body?.details);
  }

  return body?.data as T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "INVENTORY_MANAGER";
  status: "ACTIVE" | "SUSPENDED";
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  image?: string | null;
  stock: number;
  damagedStock: number;
  reservedStock: number;
  lowStockThreshold?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: "RECEIVED" | "SOLD" | "DAMAGED" | "RESERVED" | "RETURNED" | "ADJUSTMENT";
  unitPrice?: number | null;
  costPrice?: number | null;
  reason?: string | null;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DashboardSummary {
  totalSales: number;
  totalCOGS: number;
  totalExpenses: number;
  totalRefunds: number;
  grossProfit: number;
  netProfit: number;
  profitMarginPercentage: number;
  totalStockItems: number;
  outOfStockCount: number;
  lowStockCount: number;
  alerts: { id: string; name: string; sku: string; stock: number; lowStockThreshold: number }[];
}

export type DashboardStats = DashboardSummary;

export interface DashboardChartData {
  timeline: { name: string; date: string; sales: number; profit: number }[];
  categories: { id: string; name: string; productCount: number; stockValue: number }[];
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "INVENTORY_MANAGER";
  status: "ACTIVE" | "SUSPENDED";
  phone?: string | null;
  createdAt: string;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<AuthUser>("/auth/me", { token }),

  /**
   * Calls /auth/refresh. The HttpOnly cookie is sent automatically via
   * `credentials: "include"` (already set in the core request helper).
   * Returns the new access token so callers can update their state.
   */
  silentRefresh: (refreshToken?: string) =>
    request<{ accessToken: string; user: AuthUser }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),

  logout: (refreshToken?: string) =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),

  // Categories API
  getCategories: (token: string) =>
    request<Category[]>("/categories", { token }),

  createCategory: (token: string, data: { name: string; description?: string }) =>
    request<Category>("/categories", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (token: string, id: string, data: { name: string; description?: string }) =>
    request<Category>(`/categories/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCategory: (token: string, id: string) =>
    request<{ message: string }>(`/categories/${id}`, {
      token,
      method: "DELETE",
    }),

  // Products API
  getProducts: (token: string, filters?: { search?: string; categoryId?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.categoryId) params.append("categoryId", filters.categoryId);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<PaginatedResponse<Product>>(`/products${query}`, { token });
  },

  createProduct: (token: string, data: Omit<Product, "id" | "createdAt" | "updatedAt" | "category" | "stock" | "damagedStock" | "reservedStock">) =>
    request<Product>("/products", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (token: string, id: string, data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt" | "category" | "stock" | "damagedStock" | "reservedStock">>) =>
    request<Product>(`/products/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (token: string, id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      token,
      method: "DELETE",
    }),

  getProductSubstitutes: (token: string, id: string) =>
    request<{ targetProduct: Product; substitutes: Product[] }>(`/products/${id}/substitutes`, { token }),

  // Staff/User administration API (Shop Owner/ADMIN only)
  getStaff: (token: string) =>
    request<StaffUser[]>("/users", { token }),

  registerStaff: (token: string, data: { name: string; email: string; password?: string; role: string; phone?: string }) =>
    request<StaffUser>("/auth/register", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStaff: (token: string, id: string, data: Partial<Omit<StaffUser, "id" | "createdAt">>) =>
    request<StaffUser>(`/users/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteStaff: (token: string, id: string) =>
    request<{ message: string }>(`/users/${id}`, {
      token,
      method: "DELETE",
    }),

  // Inventory API
  getInventoryMovements: (token: string, productId: string) =>
    request<StockMovement[]>(`/inventory/products/${productId}/movements`, { token }),

  adjustStock: (token: string, productId: string, data: { quantity: number; type: string; reason?: string }) =>
    request<Product>(`/inventory/products/${productId}/adjust`, {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Dashboard API
  getDashboardStats: (token: string) =>
    request<DashboardStats>("/dashboard/stats", { token }),

  getDashboardCharts: (token: string) =>
    request<DashboardChartData>("/dashboard/charts", { token }),

  // POS API
  checkout: (token: string, data: CheckoutPayload) =>
    request<Invoice>("/pos/checkout", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Suppliers API
  getSuppliers: (token: string) =>
    request<Supplier[]>("/suppliers", { token }),

  createSupplier: (token: string, data: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "_count">) =>
    request<Supplier>("/suppliers", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSupplier: (token: string, id: string, data: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "_count">) =>
    request<Supplier>(`/suppliers/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSupplier: (token: string, id: string) =>
    request<{ message: string }>(`/suppliers/${id}`, {
      token,
      method: "DELETE",
    }),

  // Purchase Orders API
  getPurchaseOrders: (token: string) =>
    request<PurchaseOrder[]>("/purchase-orders", { token }),

  getPurchaseOrderById: (token: string, id: string) =>
    request<PurchaseOrder>(`/purchase-orders/${id}`, { token }),

  createPurchaseOrder: (token: string, data: CreatePoPayload) =>
    request<PurchaseOrder>("/purchase-orders", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePoStatus: (token: string, id: string, status: string) =>
    request<PurchaseOrder>(`/purchase-orders/${id}/status`, {
      token,
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Reports & Analytics
  getSalesAnalytics: (token: string, period = "30days", startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ period });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request<SalesAnalyticsData>(`/reports/sales-analytics?${params.toString()}`, { token });
  },

  getInventoryTurnover: (token: string) =>
    request<InventoryTurnoverData>("/reports/inventory-turnover", { token }),

  getTaxSummary: (token: string) =>
    request<TaxSummaryData>("/reports/tax-summary", { token }),

  getExportCsvUrl: (type: string) =>
    `${API_BASE_URL}/reports/export?type=${type}`,

  // Audit Logs
  getAuditLogs: (token: string, search?: string, action?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (search) params.append("search", search);
    if (action) params.append("action", action);
    return request<AuditLogResponse>(`/audit-logs?${params.toString()}`, { token });
  },

  // Notifications API
  getNotifications: (token: string) =>
    request<NotificationsResponse>("/notifications", { token }),

  markNotificationRead: (token: string, id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { token, method: "PUT" }),
};

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface CheckoutPayload {
  customerName?: string | null;
  customerPhone?: string | null;
  discount: number;
  paymentMethod: "CASH" | "UPI";
  items: CheckoutItemInput[];
}

export interface SaleItemDetail {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  discount: number;
  gstAmount: number;
  grandTotal: number;
  paymentMethod: "CASH" | "UPI";
  paymentStatus: string;
  createdAt: string;
  items: SaleItemDetail[];
  cashier?: {
    name: string;
  } | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  _count?: {
    purchaseOrders: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePoPayload {
  supplierId: string;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItemDetail {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    gstin?: string | null;
  };
  status: "PENDING" | "ORDERED" | "RECEIVED" | "CANCELLED";
  totalAmount: number;
  userId?: string | null;
  user?: {
    name: string;
  } | null;
  items?: PurchaseOrderItemDetail[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Phase 6 — Accounting Types
// ---------------------------------------------------------------------------

export type ExpenseCategory =
  | "RENT"
  | "SALARY"
  | "UTILITIES"
  | "SUPPLIES"
  | "MARKETING"
  | "OTHER";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  userId?: string | null;
  user?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type SupplierPaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

export interface SupplierPayment {
  id: string;
  purchaseOrderId: string;
  purchaseOrder: { id: string; poNumber: string; totalAmount: number };
  supplierId: string;
  supplier: { id: string; name: string };
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  reference?: string | null;
  note?: string | null;
  paidAt: string;
  userId?: string | null;
  user?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  transactionId: string;
  transaction: { id: string; invoiceNumber: string; grandTotal: number };
  amount: number;
  reason: string;
  processedById?: string | null;
  processedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface AccountingSummary {
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  totalSupplierPayments: number;
  totalRefunds: number;
  totalGstCollected: number;
  totalDiscountsGiven: number;
  grossProfit: number;
  netProfit: number;
}

export type LedgerEntryType = "INCOME" | "EXPENSE" | "SUPPLIER_PAYMENT" | "REFUND";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  label: string;
  amount: number;
  debit: number;
  credit: number;
  paymentMethod: string | null;
  date: string;
  by: string;
}

// Extend the existing api object — accounting methods
export const accountingApi = {
  getSummary: (token: string) =>
    request<AccountingSummary>("/accounting/summary", { token }),

  getLedger: (token: string) =>
    request<LedgerEntry[]>("/accounting/ledger", { token }),

  // Expenses
  getExpenses: (token: string) =>
    request<Expense[]>("/accounting/expenses", { token }),

  createExpense: (
    token: string,
    data: { category: ExpenseCategory; description: string; amount: number; date: string }
  ) =>
    request<Expense>("/accounting/expenses", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExpense: (
    token: string,
    id: string,
    data: Partial<{ category: ExpenseCategory; description: string; amount: number; date: string }>
  ) =>
    request<Expense>(`/accounting/expenses/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteExpense: (token: string, id: string) =>
    request<{ message: string }>(`/accounting/expenses/${id}`, {
      token,
      method: "DELETE",
    }),

  // Supplier Payments
  getSupplierPayments: (token: string) =>
    request<SupplierPayment[]>("/accounting/supplier-payments", { token }),

  createSupplierPayment: (
    token: string,
    data: {
      purchaseOrderId: string;
      supplierId: string;
      amount: number;
      paymentMethod: SupplierPaymentMethod;
      reference?: string;
      note?: string;
      paidAt: string;
    }
  ) =>
    request<SupplierPayment>("/accounting/supplier-payments", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Refunds
  getRefunds: (token: string) =>
    request<Refund[]>("/accounting/refunds", { token }),

  createRefund: (
    token: string,
    data: { transactionId: string; amount: number; reason: string }
  ) =>
    request<Refund>("/accounting/refunds", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// REPORT & AUDIT LOG TYPES
// ---------------------------------------------------------------------------

export interface SalesAnalyticsData {
  summary: {
    totalSales: number;
    totalInvoices: number;
    averageOrderValue: number;
    cashRevenue: number;
    upiRevenue: number;
  };
  salesTrend: { date: string; sales: number; invoices: number }[];
  hourlyDistribution: { hour: number; label: string; amount: number; count: number }[];
  topProducts: { id: string; name: string; category: string; quantity: number; revenue: number }[];
  categoryBreakdown: { category: string; revenue: number; percentage: number }[];
}

export interface InventoryTurnoverData {
  summary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCostValuation: number;
    totalRetailValuation: number;
    potentialMargin: number;
  };
  fastMovers: { id: string; name: string; category: string; totalQuantitySold: number; stock: number }[];
  slowMovers: { id: string; name: string; category: string; totalQuantitySold: number; stock: number }[];
  items: {
    id: string;
    name: string;
    sku: string;
    category: string;
    stock: number;
    lowStockThreshold: number;
    purchasePrice: number;
    sellingPrice: number;
    costValuation: number;
    retailValuation: number;
    totalQuantitySold: number;
    status: string;
  }[];
}

export interface TaxSummaryData {
  totalTaxableTurnover: number;
  totalGstCollected: number;
  totalGrossTurnover: number;
  gstTiers: {
    gstRate: number;
    taxableValue: number;
    gstAmount: number;
    total: number;
    itemCount: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user?: { id: string; name: string; email: string; role: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AppNotification {
  id: string;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "PO_UPDATE" | "REFUND_ALERT" | "SYSTEM";
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "INFO";
  read: boolean;
  linkTab?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}


