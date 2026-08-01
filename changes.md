🔴 Critical (must fix before going live)
1. SQLite → needs PostgreSQL for production SQLite is fine for dev/local testing, but it has write-lock issues under concurrent load and can't run on a separate server. Swap to PostgreSQL before deploying.

2. Access tokens stored in localStorage The refresh token is in localStorage, which is vulnerable to XSS. Production should store the refresh token in an HttpOnly cookie and keep only the short-lived access token in memory.

3. No token refresh logic on the frontend When the access token expires (typically 15 minutes), requests fail with 401 and redirect to /login. There's no silent refresh call. Users get kicked out mid-session.

4. No file/image upload for products The schema has an image field on products, but there's no upload endpoint. Right now it accepts a URL string. For real-world use you need a file upload endpoint (multer/S3/local disk).

5. Invoice numbers can collide under concurrent checkouts

typescript

const count = await tx.transaction.count();
const invoiceNumber = `INV-${dateCode}-${(count + 1).toString().padStart(4, "0")}`;
Two simultaneous checkouts can read the same count and generate identical invoice numbers. Use an atomic sequence or UUID-based invoice numbers.

6. Dashboard stats don't deduct refunds or expenses from profit netProfit = totalSales - totalCost — expenses and refunds recorded in the Expense/Refund tables are completely ignored. The accounting view has them but the dashboard summary doesn't use them.

7. Low-stock threshold is hardcoded to 10

typescript

if (prod.stock <= 10) { lowStockCount++; }
Different products need different reorder points. This should be a per-product field.

🟡 Important (affects usability significantly)
8. No barcode scanner integration on POS The schema has a barcode field and the POS UI has an input field, but there's no actual barcode scanning — no BarcodeDetector API or external library wired up. A stationery shop POS without scan-to-add is very slow.

9. No print/thermal receipt support The ReceiptModal exists but doesn't connect to any real print service. POS needs window.print() with a receipt-optimized CSS print layout, or integration with a thermal printer (ESC/POS).

10. No pagination on any list endpoint Products, transactions, movements — all return the full table. As data grows this will kill performance. Every GET list endpoint needs page / limit / cursor-based pagination.

11. Discount is applied after GST, not before GST is computed on sellingPrice, and the flat discount is subtracted from grandTotal. For GST-compliant invoices in India, discount should reduce the taxable value. This affects the GST amount on the invoice.

12. No purchase order receiving flow Status goes from PENDING → ORDERED → RECEIVED but when a PO is marked RECEIVED, stock is not automatically updated. The inventory manager would have to manually adjust stock.

13. No customer management / transaction history Transactions have customerName/customerPhone as plain strings. There's no Customer model, no way to look up a customer's history or apply loyalty pricing.

🟢 Nice to have (production polish)
14. No tests whatsoever — zero unit or integration tests. One DB seed isn't a test suite.

15. No Docker / docker-compose — deployment is manual. A docker-compose.yml with Postgres + backend + frontend would make hosting straightforward.

16. No CI/CD pipeline — no GitHub Actions or similar.

17. NEXT_PUBLIC_API_URL is hardcoded fallback to localhost:4000 — needs a proper environment management strategy for staging vs production.

18. Sensitive data in localStorage — the entire session object (user info + both tokens) is in localStorage. Anyone with access to the browser can read it.

19. No email notifications — low stock alerts, PO confirmations etc. are purely UI. No email/SMS integration.

20. prisma.seed.ts uses placeholder/sample data — fine for development, not for a handoff to a real shop.

Summary
Area	Status
Data model / schema	Solid
Auth & security	Good foundation, needs HttpOnly cookies + token refresh
POS billing	Works, has race condition in invoice numbers
Inventory	Works, PO receiving doesn't auto-update stock
Accounting	Wired up, but dashboard doesn't use it for profit
Frontend UI	Complete feature coverage
Production readiness	~50% — needs the red items above before going live
Task #8 — Pagination on all list endpoints