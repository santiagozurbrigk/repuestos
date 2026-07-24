import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("current_stock")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (data || []).filter(
    (p) => p.current_stock < 0 || p.current_stock <= p.min_stock
  );

  return NextResponse.json(filtered);
}
