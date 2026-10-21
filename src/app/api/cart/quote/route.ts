import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { quoteCart } from "@/server/checkout/quote";

export async function POST(req: Request) {
  try {
    return NextResponse.json(await quoteCart(await req.json()));
  } catch (e) {
    if (e instanceof ZodError || e instanceof SyntaxError) return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
    throw e;
  }
}
