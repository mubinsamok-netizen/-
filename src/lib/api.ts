import type { Billing, BillingAction, Customer } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API error ${response.status}`);
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
