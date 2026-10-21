export interface CartLine {
  variantId: string;
  quantity: number;
}

const KEY = "cart:v1";

export function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l.variantId === "string" && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Storage unavailable (private mode): the cart lives only in memory.
  }
}

export function addToCart(variantId: string, quantity: number) {
  const lines = readCart();
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
  else lines.push({ variantId, quantity });
  writeCart(lines);
}

export function clearCart() {
  writeCart([]);
}
