import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CheckoutError, startCheckout } from "@/server/checkout/checkout-service";
import { logger } from "@/server/logger";

export async function POST(req: Request) {
  try {
    const result = await startCheckout(await req.json());
    return NextResponse.json({ redirectUrl: result.redirectUrl });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Revisa los datos del formulario.", fields: e.flatten().fieldErrors }, { status: 400 });
    }
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    logger.error("checkout.failed", { error: String(e) });
    return NextResponse.json({ error: "No se pudo iniciar el pago. Inténtalo de nuevo." }, { status: 500 });
  }
}
