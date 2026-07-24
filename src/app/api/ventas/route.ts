import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      items:sale_items(
        *,
        product:products(id, name, barcode)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { items, total_amount, notes } = body as {
    items: { product_id: string; quantity: number; product_name?: string; barcode?: string }[];
    total_amount: number;
    notes?: string;
  };

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({ total_amount, notes: notes || null })
    .select()
    .single();

  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 });

  const saleItems = items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const movements = items.map((item) => ({
    product_id: item.product_id,
    quantity_change: -item.quantity,
    movement_type: "exit" as const,
    sale_id: sale.id,
    notes: `Venta #${sale.id.slice(0, 8)}`,
  }));

  const { error: movError } = await supabase.from("stock_movements").insert(movements);
  if (movError) return NextResponse.json({ error: movError.message }, { status: 500 });

  return NextResponse.json(sale, { status: 201 });
}
