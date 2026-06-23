import {
  AlertCircle,
  Bell,
  ChevronDown,
  CheckCircle2,
  FileText,
  LineChart,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlexPreview } from "./components/FlexPreview";
import { StatusBadge } from "./components/StatusBadge";
import { api } from "./lib/api";
import { createId, formatBaht, formatDate, getDueTone, statuses } from "./lib/format";
import type { Billing, BillingAction, BillingStatus, Customer } from "./types";

type WorkspaceTab = "list" | "billing" | "customer" | "preview";
type ToastState = { id: number; message: string; type: "success" | "error" };

const blankCustomer: Customer = {
  id: "",
  name: "",
  contactName: "",
  lineUserId: "",
  phone: "",
  email: "",
  note: "",
  status: "ใช้งาน"
};

function createBlankBilling(customer?: Customer): Billing {
  return {
    id: "",
    customerId: customer?.id ?? "",
    customerName: customer?.name ?? "",
    contactName: customer?.contactName ?? "",
    lineUserId: customer?.lineUserId ?? "",
    amount: 0,
    dueDate: new Date().toISOString().slice(0, 10),
    pdfUrl: "",
    status: "รอส่ง",
    reminderCount: 0,
    customerComment: "",
    customerCommentAt: "",
    note: ""
  };
}

export default function App() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedBillingId, setSelectedBillingId] = useState("");
  const [billingDraft, setBillingDraft] = useState<Billing>(() => createBlankBilling());
  const [customerDraft, setCustomerDraft] = useState<Customer>(blankCustomer);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillingStatus | "ทั้งหมด">("ทั้งหมด");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("list");
  const [notice, setNotice] = useState("กำลังโหลดข้อมูลจาก Google Sheets");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: ToastState["type"] = "success") {
    setToast({ id: Date.now(), message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function loadData() {
    const isRefresh = !initialLoading;
    setBusy(true);
    setLoadError("");
    try {
      const [billingResult, customerResult] = await Promise.all([api.getBillings(), api.getCustomers()]);
      const nextBillings = billingResult.billings;
      const nextCustomers = customerResult.customers;
      setBillings(nextBillings);
      setCustomers(nextCustomers);
      const nextSelected = nextBillings.find((billing) => billing.id === selectedBillingId) ?? nextBillings[0];
      setSelectedBillingId(nextSelected?.id ?? "");
      setBillingDraft(nextSelected ?? createBlankBilling(nextCustomers[0]));
      setCustomerDraft(nextCustomers[0] ?? blankCustomer);
      const message = nextBillings.length ? "อัปเดตข้อมูลจาก Google Sheets แล้ว" : "เชื่อมต่อ Google Sheets แล้ว ยังไม่มีรายการวางบิล";
      setNotice(message);
      if (isRefresh) showToast(message);
    } catch (err) {
      const message = getErrorMessage(err);
      setLoadError(message);
      setNotice(`โหลดข้อมูลไม่สำเร็จ: ${message}`);
      showToast(`โหลดข้อมูลไม่สำเร็จ: ${message}`, "error");
    } finally {
      setInitialLoading(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedBilling = useMemo(
    () => billings.find((billing) => billing.id === selectedBillingId) ?? billingDraft,
    [billings, billingDraft, selectedBillingId]
  );

  const filteredBillings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return billings.filter((billing) => {
      const matchStatus = statusFilter === "ทั้งหมด" || billing.status === statusFilter;
      const matchQuery =
        !normalizedQuery ||
        [billing.id, billing.customerName, billing.contactName, billing.note, billing.customerComment]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchStatus && matchQuery;
    });
  }, [billings, query, statusFilter]);

  const summary = useMemo(
    () => ({
      รอส่ง: billings.filter((item) => item.status === "รอส่ง").length,
      รอชำระ: billings.filter((item) => item.status === "รอชำระ" || item.status === "ส่งแล้ว").length,
      เตือนแล้ว: billings.filter((item) => item.status === "เตือนแล้ว").length,
      ชำระแล้ว: billings.filter((item) => item.status === "ชำระแล้ว").length
    }),
    [billings]
  );

  useEffect(() => {
    if (!filteredBillings.length) return;
    const selectedStillVisible = filteredBillings.some((billing) => billing.id === selectedBillingId);
    if (!selectedStillVisible) {
      selectBilling(filteredBillings[0]);
    }
  }, [filteredBillings, selectedBillingId]);

  function selectBilling(billing: Billing) {
    setSelectedBillingId(billing.id);
    setBillingDraft(billing);
    const customer = customers.find((item) => item.id === billing.customerId);
    if (customer) setCustomerDraft(customer);
  }

  function applyCustomerToBilling(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    setCustomerDraft(customer);
    setBillingDraft((draft) => ({
      ...draft,
      customerId: customer.id,
      customerName: customer.name,
      contactName: customer.contactName,
      lineUserId: customer.lineUserId
    }));
  }

  async function saveBilling() {
    const nextBilling = {
      ...billingDraft,
      id: billingDraft.id || createId("BILL")
    };
    setBusy(true);
    try {
      const result = await api.saveBilling(nextBilling);
      upsertLocalBilling(result.billing);
      const message = "บันทึกรายการวางบิลลง Google Sheets แล้ว";
      setNotice(message);
      showToast(message);
    } catch (err) {
      const message = `บันทึกรายการไม่สำเร็จ: ${getErrorMessage(err)}`;
      setNotice(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomer() {
    const isNewCustomer = !customerDraft.id;
    const nextCustomer = {
      ...customerDraft,
      id: customerDraft.id || createId("CUS")
    };
    setBusy(true);
    try {
      const result = await api.saveCustomer(nextCustomer);
      upsertLocalCustomer(result.customer);
      const message = isNewCustomer
        ? "เพิ่มลูกค้าใหม่ลง Google Sheets แล้ว"
        : "อัปเดตข้อมูลลูกค้าใน Google Sheets แล้ว";
      setNotice(message);
      showToast(message);
    } catch (err) {
      const message = `บันทึกข้อมูลลูกค้าไม่สำเร็จ: ${getErrorMessage(err)}`;
      setNotice(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  function upsertLocalBilling(nextBilling: Billing) {
    setBillings((items) => {
      const exists = items.some((item) => item.id === nextBilling.id);
      return exists ? items.map((item) => (item.id === nextBilling.id ? nextBilling : item)) : [nextBilling, ...items];
    });
    setSelectedBillingId(nextBilling.id);
    setBillingDraft(nextBilling);
  }

  function upsertLocalCustomer(nextCustomer: Customer) {
    setCustomers((items) => {
      const exists = items.some((item) => item.id === nextCustomer.id);
      return exists ? items.map((item) => (item.id === nextCustomer.id ? nextCustomer : item)) : [nextCustomer, ...items];
    });
    setCustomerDraft(nextCustomer);
  }

  function selectCustomer(customerId: string) {
    if (!customerId) {
      startNewCustomer();
      return;
    }
    const customer = customers.find((item) => item.id === customerId);
    if (customer) setCustomerDraft(customer);
  }

  function startNewCustomer() {
    setCustomerDraft({ ...blankCustomer });
  }

  async function runAction(action: BillingAction) {
    if (!selectedBilling.id) {
      showToast("กรุณาเลือกรายการวางบิลก่อนทำรายการ", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await api.runBillingAction(selectedBilling.id, action);
      upsertLocalBilling(result.billing);
      const message = result.message ?? "ทำรายการสำเร็จ";
      setNotice(message);
      showToast(message);
    } catch (err) {
      const message = `ทำรายการไม่สำเร็จ: ${getErrorMessage(err)}`;
      setNotice(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>ระบบวางบิลลูกค้า</h1>
          <p>จัดการรายการวางบิล ส่ง LINE และติดตามสถานะชำระเงินจากหน้าจอเดียว</p>
        </div>
        <button className="button ghost" type="button" onClick={loadData} disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          รีเฟรชข้อมูล
        </button>
      </header>

      <section className="notice" aria-live="polite">
        {notice}
      </section>

      <section className="summary-grid" aria-label="สรุปสถานะ">
        <SummaryCard icon={<FileText size={20} />} label="รอส่ง" value={initialLoading ? "–" : summary["รอส่ง"]} tone="mint" />
        <SummaryCard icon={<LineChart size={20} />} label="รอชำระ" value={initialLoading ? "–" : summary["รอชำระ"]} tone="blue" />
        <SummaryCard icon={<Bell size={20} />} label="เตือนแล้ว" value={initialLoading ? "–" : summary["เตือนแล้ว"]} tone="amber" />
        <SummaryCard icon={<CheckCircle2 size={20} />} label="ชำระแล้ว" value={initialLoading ? "–" : summary["ชำระแล้ว"]} tone="green" />
      </section>

      <section className="workspace-tabs" role="tablist" aria-label="เมนูพื้นที่ทำงาน">
        <button className={activeTab === "list" ? "active" : ""} type="button" onClick={() => setActiveTab("list")}>
          รายการวางบิล
        </button>
        <button className={activeTab === "billing" ? "active" : ""} type="button" onClick={() => setActiveTab("billing")}>
          รายละเอียดบิล
        </button>
        <button className={activeTab === "customer" ? "active" : ""} type="button" onClick={() => setActiveTab("customer")}>
          ข้อมูลลูกค้า
        </button>
        <button className={activeTab === "preview" ? "active" : ""} type="button" onClick={() => setActiveTab("preview")}>
          ตัวอย่าง LINE
        </button>
      </section>

      <section className="workspace">
        {activeTab === "list" && (
          <div className="table-panel">
            <div className="panel-toolbar">
              <div>
                <h2>รายการวางบิล</h2>
                <p>{initialLoading ? "กำลังโหลดรายการ..." : `${filteredBillings.length} รายการที่ตรงเงื่อนไข`}</p>
              </div>
              <button
                className="button primary"
                type="button"
                disabled={initialLoading}
                onClick={() => {
                  setBillingDraft(createBlankBilling(customers[0]));
                  setActiveTab("billing");
                }}
              >
                <Plus size={18} />
                เพิ่มรายการ
              </button>
            </div>

            <div className="filters" aria-busy={initialLoading}>
              <label className="searchbox">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาชื่อลูกค้า เลขที่บิล หรือหมายเหตุ"
                  disabled={initialLoading}
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as BillingStatus | "ทั้งหมด")}
                disabled={initialLoading}
              >
                <option value="ทั้งหมด">ทุกสถานะ</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {initialLoading ? (
              <DataState icon={<Loader2 className="spin" size={22} />} title="กำลังโหลดข้อมูล" detail="กำลังอ่านรายการจาก Google Sheets" />
            ) : loadError && !billings.length ? (
              <DataState
                icon={<RefreshCw size={22} />}
                title="โหลดข้อมูลไม่สำเร็จ"
                detail={loadError}
                action={<button className="button ghost" type="button" onClick={loadData}>ลองใหม่</button>}
              />
            ) : !filteredBillings.length ? (
              <DataState
                icon={<FileText size={22} />}
                title={billings.length ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีรายการวางบิล"}
                detail={billings.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ" : "กดเพิ่มรายการเพื่อสร้างบิลแรก"}
              />
            ) : (
              <div className="table-wrap">
                <table>
                <thead>
                  <tr>
                    <th>เลขที่</th>
                    <th>ลูกค้า</th>
                    <th>ยอดชำระ</th>
                    <th>ครบกำหนด</th>
                    <th>สถานะ</th>
                    <th>ส่งล่าสุด</th>
                    <th>เอกสาร</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBillings.map((billing) => (
                    <tr
                      key={billing.id}
                      className={billing.id === selectedBilling.id ? "selected-row" : ""}
                      onClick={() => {
                        selectBilling(billing);
                        setActiveTab("billing");
                      }}
                    >
                      <td data-label="เลขที่">{billing.id}</td>
                      <td data-label="ลูกค้า">
                        <strong>{billing.customerName}</strong>
                        <span>{billing.contactName}</span>
                      </td>
                      <td data-label="ยอดชำระ">{formatBaht(billing.amount)}</td>
                      <td data-label="ครบกำหนด" data-tone={getDueTone(billing.dueDate, billing.status)}>
                        {formatDate(billing.dueDate)}
                      </td>
                      <td data-label="สถานะ">
                        <StatusBadge status={billing.status} />
                      </td>
                      <td data-label="ส่งล่าสุด">{formatDate(billing.lastSentAt)}</td>
                      <td data-label="เอกสาร">
                        <a href={billing.pdfUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                          เปิด PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <aside className="side-panel detail-grid">
            <BillingForm
              billing={billingDraft}
              customers={customers}
              onChange={setBillingDraft}
              onCustomerChange={applyCustomerToBilling}
              onSave={saveBilling}
            />
            <div>
              <div className="action-bar" aria-label="คำสั่งรายการวางบิล">
                <button className="button primary" type="button" onClick={() => runAction("invoice")} disabled={busy}>
                  <MessageCircle size={18} />
                  ส่ง LINE
                </button>
                <button className="button soft" type="button" onClick={() => runAction("reminder")} disabled={busy}>
                  <Bell size={18} />
                  เตือนชำระ
                </button>
                <button className="button success" type="button" onClick={() => runAction("paid")} disabled={busy}>
                  <CheckCircle2 size={18} />
                  ชำระแล้ว
                </button>
              </div>
              <FlexPreview billing={selectedBilling} />
            </div>
          </aside>
        )}

        {activeTab === "customer" && (
          <aside className="side-panel form-panel">
            <div className="customer-switcher">
              <div className="customer-picker">
                <div className="customer-picker__label">
                  <span>ลูกค้าในระบบ</span>
                  <strong>{customers.length} ราย</strong>
                </div>
                <label className="customer-picker__select">
                  <Users size={18} aria-hidden="true" />
                  <select value={customerDraft.id} onChange={(event) => selectCustomer(event.target.value)}>
                    <option value="">เพิ่มลูกค้าใหม่</option>
                    {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.contactName ? `- ${customer.contactName}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="customer-picker__chevron" size={18} aria-hidden="true" />
                </label>
              </div>
              <button className="button ghost" type="button" onClick={startNewCustomer}>
                <Plus size={18} />
                เพิ่มลูกค้าใหม่
              </button>
            </div>
            <CustomerForm customer={customerDraft} onChange={setCustomerDraft} onSave={saveCustomer} busy={busy} />
          </aside>
        )}

        {activeTab === "preview" && (
          <aside className="side-panel preview-panel">
            <FlexPreview billing={selectedBilling} />
          </aside>
        )}
      </section>
      {toast ? <ToastMessage toast={toast} onClose={() => setToast(null)} /> : null}
    </main>
  );
}

function ToastMessage({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const isSuccess = toast.type === "success";

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <div className={`toast ${toast.type}`} role={isSuccess ? "status" : "alert"}>
        <div className="toast__icon">{isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}</div>
        <div className="toast__content">
          <strong>{isSuccess ? "สำเร็จ" : "ไม่สำเร็จ"}</strong>
          <p>{toast.message}</p>
        </div>
        <button className="toast__close" type="button" onClick={onClose} aria-label="ปิดการแจ้งเตือน">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function DataState({
  icon,
  title,
  detail,
  action
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="data-state">
      <div className="data-state__icon">{icon}</div>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  );
}

function getErrorMessage(err: unknown) {
  if (!(err instanceof Error)) return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    return parsed.error || err.message;
  } catch {
    return err.message;
  }
}

function SummaryCard({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: "mint" | "blue" | "amber" | "green";
}) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-card__icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function BillingForm({
  billing,
  customers,
  onChange,
  onCustomerChange,
  onSave
}: {
  billing: Billing;
  customers: Customer[];
  onChange: (billing: Billing) => void;
  onCustomerChange: (customerId: string) => void;
  onSave: () => void;
}) {
  return (
    <form className="form-stack" onSubmit={(event) => event.preventDefault()}>
      <div className="form-heading">
        <h2>รายละเอียดวางบิล</h2>
        <button className="button primary" type="button" onClick={onSave}>
          <Save size={18} />
          บันทึก
        </button>
      </div>
      <label>
        ลูกค้า
        <select value={billing.customerId} onChange={(event) => onCustomerChange(event.target.value)}>
          <option value="">เลือกลูกค้า</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <div className="two-columns">
        <label>
          ยอดเงิน
          <input
            className="amount-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={billing.amount || ""}
            onChange={(event) => onChange({ ...billing, amount: Number(event.target.value) })}
          />
        </label>
        <label>
          วันครบกำหนด
          <input type="date" value={billing.dueDate} onChange={(event) => onChange({ ...billing, dueDate: event.target.value })} />
        </label>
      </div>
      <label>
        ลิงก์เอกสาร PDF
        <input value={billing.pdfUrl} onChange={(event) => onChange({ ...billing, pdfUrl: event.target.value })} />
      </label>
      <label>
        สถานะ
        <select value={billing.status} onChange={(event) => onChange({ ...billing, status: event.target.value as BillingStatus })}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="readonly-field">
        ประวัติข้อความจาก LINE
        <span className="field-help">สรุปเฉพาะข้อความที่ลูกค้าส่งกลับมาจาก LINE</span>
        <LineHistory value={billing.customerComment} />
      </label>
      <label>
        หมายเหตุ
        <textarea value={billing.note} onChange={(event) => onChange({ ...billing, note: event.target.value })} rows={3} />
      </label>
    </form>
  );
}

function LineHistory({ value }: { value?: string }) {
  const items = parseLineHistory(value);

  if (!items.length) {
    return <div className="line-history empty">ยังไม่มีข้อความจากลูกค้าใน LINE</div>;
  }

  return (
    <div className="line-history">
      {items.map((item, index) => (
        <article className="line-history__item" key={`${item.time}-${item.shortBillId}-${index}`}>
          <div className="line-history__meta">
            <span>{item.time}</span>
            <b>{item.label}</b>
          </div>
          <span className="line-history__bill">{item.shortBillId}</span>
          {item.detail && <p>{item.detail}</p>}
        </article>
      ))}
    </div>
  );
}

function parseLineHistory(value?: string) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+?)\]\s*(.+)$/);
      const time = match?.[1] ?? "";
      const text = match?.[2] ?? line;
      const billId = text.match(/BILL[-A-Z0-9]+/i)?.[0]?.toUpperCase() ?? "";
      const shortBillId = billId ? `...${billId.slice(-6)}` : "";
      const cleanedText = text.replace(/BILL[-A-Z0-9]+/i, "").trim();
      const label = getLineHistoryLabel(cleanedText);
      const detail = cleanedText.replace(/^(แจ้งชำระเงิน|สอบถามเรื่องบิล|แจ้งปัญหา)\s*/i, "").trim();

      return { time, label, shortBillId, detail };
    });
}

function getLineHistoryLabel(text: string) {
  if (text.includes("แจ้งชำระเงิน")) return "แจ้งชำระเงิน";
  if (text.includes("สอบถามเรื่องบิล") || text.includes("แจ้งปัญหา")) return "สอบถาม/แจ้งปัญหา";
  return "ข้อความลูกค้า";
}

function CustomerForm({
  customer,
  onChange,
  onSave,
  busy
}: {
  customer: Customer;
  onChange: (customer: Customer) => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <form className="form-stack" onSubmit={(event) => event.preventDefault()}>
      <div className="form-heading">
        <div>
          <h2>{customer.id ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}</h2>
          <p>{customer.id ? `รหัสลูกค้า ${customer.id}` : "กรอกข้อมูลเพื่อสร้างลูกค้ารายใหม่"}</p>
        </div>
        <button className="button primary" type="button" onClick={onSave} disabled={busy || !customer.name.trim()}>
          {busy ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          {customer.id ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
        </button>
      </div>
      <label>
        ชื่อลูกค้า
        <input value={customer.name} onChange={(event) => onChange({ ...customer, name: event.target.value })} />
      </label>
      <label>
        ผู้ติดต่อ
        <input value={customer.contactName} onChange={(event) => onChange({ ...customer, contactName: event.target.value })} />
      </label>
      <label>
        LINE userId / groupId
        <input value={customer.lineUserId} onChange={(event) => onChange({ ...customer, lineUserId: event.target.value })} />
      </label>
      <div className="two-columns">
        <label>
          โทรศัพท์
          <input value={customer.phone} onChange={(event) => onChange({ ...customer, phone: event.target.value })} />
        </label>
        <label>
          อีเมล
          <input value={customer.email} onChange={(event) => onChange({ ...customer, email: event.target.value })} />
        </label>
      </div>
      <label>
        หมายเหตุ
        <textarea value={customer.note} onChange={(event) => onChange({ ...customer, note: event.target.value })} rows={3} />
      </label>
    </form>
  );
}
