import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 80) return NextResponse.json({ error: "Query is too long" }, { status: 400 });
  return NextResponse.json(await searchProducts(query));
}
