import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const items = body.items as {
    id: string;
    product_id: string | null;
    raw_product_name: string;
    quantity: number;
    unit_cost: number | null;
    is_service: boolean;
    create_product?: boolean;
    product_name?: string;
  }[];

  for (const item of items) {
    if (item.is_service) continue;

    let productId = item.product_id;

    if (!productId && item.create_product && item.product_name) {
      const { data: newProduct } = await supabase
        .from("products")
        .insert({ name: item.product_name, min_stock: 1 })
        .select()
        .single();
      productId = newProduct?.id || null;

      await supabase
        .from("invoice_items")
        .update({ product_id: productId })
        .eq("id", item.id);
    }

    if (productId) {
      await supabase.from("stock_movements").insert({
        product_id: productId,
        quantity_change: item.quantity,
        movement_type: "invoice_entry",
        invoice_id: id,
        notes: `Entrada por factura`,
      });
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "confirmed" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
