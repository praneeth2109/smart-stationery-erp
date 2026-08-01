# Task Checklist - Phase 2 (Completed)

- [x] Update database schema & migrate
- [x] Implement backend CRUD APIs
- [x] Implement frontend dashboard shell & views
- [x] Verify functionality

# Task Checklist - Phase 3 (Completed)

- [x] Update database schema & migrate
- [x] Implement backend Inventory & Analytics APIs
- [x] Implement frontend Inventory & Live Dashboard UI
- [x] Verify functionality

# Task Checklist - Phase 4 (Completed)

- [x] Update database schema & migrate
- [x] Implement backend POS Billing APIs
- [x] Implement frontend POS Checkout & Simulation
- [x] Verify functionality

# Task Checklist - Phase 5 (Completed)

- [x] Update database schema & migrate
  - [x] Add `Supplier`, `PurchaseOrder`, and `PurchaseOrderItem` models to `schema.prisma`
  - [x] Run `npx prisma db push` to apply changes
- [x] Implement backend Supplier & Purchase Order APIs
  - [x] Create `supplier.schema.ts` (Zod validation for suppliers)
  - [x] Create `purchaseOrder.schema.ts` (Zod validation for POs and status updates)
  - [x] Create Supplier controller & routes (`GET`, `POST`, `PUT`, `DELETE` at `/api/suppliers`)
  - [x] Create Purchase Order controller & routes (`GET` all, `GET` by ID, `POST` create draft, `PUT` status transition)
  - [x] Update seed script to seed mock suppliers and draft purchase orders
- [x] Implement frontend Supplier & PO UI
  - [x] Extend `frontend/src/lib/api.ts` with supplier and purchase order endpoints and interfaces
  - [x] Create `SuppliersView.tsx` with card listing and add/edit modals
  - [x] Create `PurchaseOrderListView.tsx` with a tabular listing and create PO modal (basket editor)
  - [x] Create `PurchaseOrderDetailModal.tsx` showing PO receipt invoice details and action buttons (Mark Ordered / Receive Stock)
  - [x] Wire Suppliers & Purchase Orders tabs in sidebar layout and switch view states
- [x] Verify functionality
  - [x] Run frontend and backend type checking
  - [x] Receive a Purchase Order and verify available stock replenishes in products view and stock movements log

# Task Checklist - Phase 6 (Completed)

- [x] Database schema & models (`Expense`, `SupplierPayment`, `Refund`)
- [x] Implement backend Accounting APIs (`accounting.controller.ts`, `/api/accounting`)
  - [x] P&L summary calculation
  - [x] Combined ledger view (Income, Expenses, Supplier Payments, Refunds)
  - [x] CRUD for Expenses, Supplier Payments, Refunds
- [x] Implement frontend Accounting UI (`AccountingView.tsx`)

# Task Checklist - Phase 7 (Completed)

- [x] Implement backend Reports & Analytics APIs (`reports.controller.ts`, `/api/reports`)
  - [x] Sales trends & hourly peak distribution heatmap data
  - [x] Inventory turnover, cost vs retail valuation, fast/slow movers
  - [x] GST tax tier liability breakdown (0%, 5%, 12%, 18%, 28%)
  - [x] CSV dataset export endpoint for Sales, Inventory, Tax, and Ledger
- [x] Implement frontend Reports & Analytics UI (`ReportsView.tsx`)
  - [x] Date period selector (Today, 7 Days, 30 Days, YTD)
  - [x] Hourly sales distribution chart & top products/categories
  - [x] GST compliance table & CSV download triggers

# Task Checklist - Phase 8 (Completed)

- [x] Implement backend Audit Log API (`audit.controller.ts`, `/api/audit-logs`)
- [x] Implement frontend Audit Log Viewer (`AuditLogView.tsx`)
  - [x] Security event search, action filtering, role badges, IP address tracking
- [x] Wire up navigation and role security guards in `DashboardLayout.tsx` and `app/dashboard/page.tsx`

