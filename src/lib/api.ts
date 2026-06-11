import type { Billing, BillingAction, Customer } from "../types";

const ADMIN_PASSWORD_KEY = "billing_admin_password";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getStoredAdminPassword() {
  return window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";
}

export function setStoredAdminPassword(password: string) {
  window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

export function clearStoredAdminPassword() {
  window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const password = getStoredAdminPassword();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(password ? { "X-Admin-Password": password } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: string };
      message = parsed.error || message;
    } catch {
      // Keep the raw response text when the backend returns non-JSON.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getBillings: () => request<{ billings: Billing[] }>("/api/billings"),
  saveBilling: (billing: Billing) =>
    request<{ billing: Billing }>("/api/billings", {
      method: "POST",
      body: JSON.stringify(billing)
    }),
  runBillingAction: (id: string, action: BillingAction) =>
    request<{ billing: Billing; message?: string }>(`/api/billings/${encodeURIComponent(id)}/action`, {
      method: "POST",
      body: JSON.stringify({ action })
    }),
  getCustomers: () => request<{ customers: Customer[] }>("/api/customers"),
  saveCustomer: (customer: Customer) =>
    request<{ customer: Customer }>("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer)
    })
};
