import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth })),
}));

import { createServerClient } from "@supabase/ssr";
import { refreshAdminSession } from "@/lib/supabase/session";
import { proxy } from "@/proxy";

describe("admin session refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("passes renewed tokens to the current page and browser with cache prevention", async () => {
    auth.getUser.mockImplementation(async () => {
      const options = vi.mocked(createServerClient).mock.calls[0][2];
      const cookies = options.cookies as CookieMethodsServer;
      expect(cookies.getAll()).toContainEqual({ name: "session", value: "expired" });
      cookies.setAll!([
        { name: "session", value: "renewed", options: { path: "/", sameSite: "lax", httpOnly: true } },
        { name: "old-chunk", value: "", options: { path: "/", maxAge: 0 } },
      ], { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" });
      // A second write must keep earlier cookie changes and cache headers.
      cookies.setAll!([
        { name: "new-chunk", value: "extra", options: { path: "/" } },
      ], {});
      return { data: { user: { id: "admin-id" } }, error: null };
    });

    const request = new NextRequest("https://shop.example.com/admin/products", {
      headers: { cookie: "session=expired", "x-test-header": "preserved" },
    });
    const response = await refreshAdminSession(request);

    expect(request.cookies.get("session")?.value).toBe("renewed");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("session=renewed");
    expect(response.headers.get("x-middleware-request-x-test-header")).toBe("preserved");
    expect(response.cookies.get("session")?.value).toBe("renewed");
    expect(response.cookies.get("session")?.httpOnly).toBe(true);
    expect(response.cookies.get("old-chunk")?.maxAge).toBe(0);
    expect(response.cookies.get("new-chunk")?.value).toBe("extra");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("leaves missing configuration for the existing login error handling", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await refreshAdminSession(new NextRequest("https://shop.example.com/admin"));
    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps page authentication guards in control when auth is unavailable", async () => {
    auth.getUser.mockRejectedValue(new Error("Auth unavailable"));
    const response = await refreshAdminSession(new NextRequest("https://shop.example.com/admin"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps embedded admin pages in place and restricts framing to the approved sites", async () => {
    for (const path of ["/admin", "/admin/login", "/admin/orders/123"]) {
      const response = await proxy(new NextRequest(`https://shop.example.com${path}`, {
        headers: { "sec-fetch-dest": "iframe" },
      }));
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Content-Security-Policy")).toBe(
        "frame-ancestors 'self' https://annasdogandmore.com https://www.annasdogandmore.com",
      );
    }
    expect(createServerClient).toHaveBeenCalledTimes(3);
  });

  it("does not rewrite direct pages, the prompt itself, actions or admin APIs", async () => {
    const requests = [
      new NextRequest("https://shop.example.com/admin/products", { headers: { "sec-fetch-dest": "document" } }),
      new NextRequest("https://shop.example.com/admin/open", { headers: { "sec-fetch-dest": "iframe" } }),
      new NextRequest("https://shop.example.com/admin/login", { method: "POST", headers: { "sec-fetch-dest": "iframe" } }),
      new NextRequest("https://shop.example.com/api/admin/product-images", { headers: { "sec-fetch-dest": "iframe" } }),
    ];
    for (const request of requests) {
      const response = await proxy(request);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
    expect(auth.getUser).toHaveBeenCalledTimes(requests.length);
  });

  it("blocks cross-origin and missing-origin admin API mutations", async () => {
    for (const origin of [undefined, "https://evil.example.com", "https://www.annasdogandmore.com", "null"]) {
      const response = await proxy(new NextRequest("https://shop.example.com/api/admin/product-images", {
        method: "POST", headers: origin ? { origin } : {},
      }));
      expect(response.status).toBe(403);
    }
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("allows admin API mutations originating inside the app iframe", async () => {
    const response = await proxy(new NextRequest("https://shop.example.com/api/admin/product-images", {
      method: "POST", headers: { origin: "https://shop.example.com" },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(auth.getUser).toHaveBeenCalledOnce();
  });
});
