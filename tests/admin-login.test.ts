import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { adminCookieOptions } from "@/lib/auth/admin-cookies";

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminUserClient: vi.fn(async () => ({ auth })),
}));

import { POST } from "@/app/api/admin/login/route";
import { GET } from "@/app/admin/session/route";

describe("embedded admin login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signInWithPassword.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { id: "test-admin" } }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("serializes a private partitioned admin cookie over production HTTPS", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { name, ...options } = adminCookieOptions();
    const response = new NextResponse();
    response.cookies.set(name!, "test-token", options);
    const header = response.headers.get("set-cookie")!;
    expect(header).toContain("annas-admin-auth=test-token");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=none");
    expect(header).toContain("Partitioned");
  });

  it("keeps local HTTP development login usable", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(adminCookieOptions()).toMatchObject({ sameSite: "lax", secure: false, partitioned: false });
  });

  it("checks cookie persistence through a separate browser request after successful login", async () => {
    const response = await POST(new Request("https://shop.example.com/api/admin/login", {
      method: "POST", body: new URLSearchParams({ identifier: "Admin", password: "test-password" }),
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://shop.example.com/admin/session");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@anna-s-dog-more.vercel.app", password: "test-password",
    });
  });

  it("distinguishes wrong passwords from blocked cookies", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    const response = await POST(new Request("https://shop.example.com/api/admin/login", {
      method: "POST", body: new URLSearchParams({ identifier: "Admin", password: "wrong" }),
    }));
    expect(response.headers.get("location")).toBe("https://shop.example.com/admin/login?error=invalid");
  });

  it("rejects malformed login forms before authentication", async () => {
    const response = await POST(new Request("https://shop.example.com/api/admin/login", {
      method: "POST", body: new URLSearchParams({ identifier: "Admin" }),
    }));
    expect(response.headers.get("location")).toBe("https://shop.example.com/admin/login?error=invalid");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows recovery when the browser did not return a session cookie", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    const response = await GET(new Request("https://shop.example.com/admin/session"));
    expect(response.headers.get("location")).toBe("https://shop.example.com/admin/login?error=cookies");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("continues to the guarded dashboard when cookies survived", async () => {
    const response = await GET(new Request("https://shop.example.com/admin/session"));
    expect(response.headers.get("location")).toBe("https://shop.example.com/admin");
  });
});
