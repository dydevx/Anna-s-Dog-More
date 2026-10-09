import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getDashboardSummary } from "@/lib/admin-dashboard";

const since = "2026-10-09T00:00:00Z";
const client = () => createClient("https://db.example.com", "server-test-key", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const response = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", ...headers },
});

afterEach(() => vi.unstubAllGlobals());

describe("admin dashboard aggregation", () => {
  it("uses the database aggregate without downloading orders or variants", async () => {
    const summary = { pending: 3, low_stock: 2, paid_count: 4, revenue: [{ currency: "CHF", total: 80 }] };
    vi.stubGlobal("fetch", vi.fn(async () => response(summary)));
    expect(await getDashboardSummary(client(), since)).toEqual(summary);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/rpc/admin_dashboard_summary");
    expect(JSON.parse(String(options?.body))).toEqual({ p_since: since });
  });

  it("remains usable before SQL is applied and keeps currencies separate", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input, options) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/rpc/")) return response({ code: "PGRST202", message: "Function missing" }, 404);
      if (options?.method === "HEAD") return response(null, 200, { "Content-Range": "*/7" });
      if (url.pathname.endsWith("/orders")) {
        expect(url.searchParams.get("payment_status")).toBe("eq.paid");
        expect(url.searchParams.get("created_at")).toBe(`gte.${since}`);
        return response([{ currency: "CHF", grand_total: "20.50" }, { currency: "EUR", grand_total: 10 }, { currency: "CHF", grand_total: 2 }]);
      }
      expect(url.searchParams.get("active")).toBe("eq.true");
      return response([{ stock_quantity: 1, low_stock_threshold: 2 }, { stock_quantity: 2, low_stock_threshold: 2 }, { stock_quantity: 3, low_stock_threshold: 2 }]);
    }));
    expect(await getDashboardSummary(client(), since)).toEqual({
      pending: 7, low_stock: 2, paid_count: 3,
      revenue: [{ currency: "CHF", total: 22.5 }, { currency: "EUR", total: 10 }],
    });
  });

  it("does not disguise permission or database failures as missing SQL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ code: "42501", message: "Permission denied" }, 403)));
    await expect(getDashboardSummary(client(), since)).rejects.toThrow("Unable to load dashboard summary");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not show incomplete totals when a fallback query fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input) => String(input).includes("/rpc/")
      ? response({ code: "PGRST202", message: "Function missing" }, 404)
      : response({ code: "42501", message: "Permission denied" }, 403)));
    await expect(getDashboardSummary(client(), since)).rejects.toThrow("Unable to load dashboard summary");
  });
});
