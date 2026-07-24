import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const barcode = searchParams.get("barcode");

  let dbQuery = supabase
    .from("current_stock")
    .select("*")
    .order("name");

  if (barcode) {
    dbQuery = dbQuery.eq("barcode", barcode);
  } else if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  const { data, error } = await dbQuery.limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      barcode: body.barcode || null,
      description: body.description || null,
      min_stock: body.min_stock ?? 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.initial_stock !== undefined && body.initial_stock !== null) {
    await supabase.from("stock_movements").insert({
      product_id: data.id,
      quantity_change: body.initial_stock,
      movement_type: "adjustment",
      notes: "Stock inicial al crear producto",
    });
  }

  return NextResponse.json(data, { status: 201 });
}
