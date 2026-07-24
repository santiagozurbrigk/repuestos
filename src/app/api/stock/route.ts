import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  const query = searchParams.get("q");

  let dbQuery = supabase.from("current_stock").select("*").order("name");

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  if (filter === "bajo") {
    dbQuery = dbQuery.filter("current_stock", "lte", "min_stock");
  } else if (filter === "negativo") {
    dbQuery = dbQuery.lt("current_stock", 0);
  } else if (filter === "sin_registrar") {
    dbQuery = dbQuery.lt("current_stock", 0);
  }

  const { data, error } = await dbQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      product_id: body.product_id,
      quantity_change: body.quantity_change,
      movement_type: body.movement_type || "adjustment",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
