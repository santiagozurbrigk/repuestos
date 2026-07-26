import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SCAN_PROMPT = `Analizá esta factura de proveedor de repuestos automotrices. Extraé toda la información disponible y devolvé un JSON con exactamente este formato:

{
  "supplier_name": "nombre del proveedor o null",
  "issue_date": "fecha de emisión en formato YYYY-MM-DD o null",
  "due_date": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "total_cost": número total de la factura o null,
  "items": [
    {
      "name": "nombre del producto",
      "quantity": cantidad como número,
      "unit_cost": costo unitario como número o null,
      "barcode": "código de barras si figura en la factura o null"
    }
  ]
}

Reglas importantes:
- Devolvé SOLO el JSON, sin texto adicional ni markdown
- Si un campo no está disponible, usá null
- La cantidad siempre debe ser un número entero positivo
- Los costos son números decimales sin símbolo de moneda
- Incluí todos los productos/items que aparecen en la factura`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Agregala en Vercel → Settings → Environment Variables." },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = await createClient();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const isPDF = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  if (!isPDF && !isImage) {
    return NextResponse.json({ error: "Formato no soportado. Usá imagen o PDF." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  let scannedData;

  try {
  if (isImage) {
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: SCAN_PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    scannedData = JSON.parse(text);
  } else {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: SCAN_PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    scannedData = JSON.parse(text);
  }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al analizar la factura con IA: ${message}` }, { status: 500 });
  }

  let imageUrl: string | null = null;
  if (isImage) {
    const ext = file.type.split("/")[1];
    const fileName = `invoices/${Date.now()}.${ext}`;
    const { data: uploadData } = await supabase.storage
      .from("facturas")
      .upload(fileName, buffer, { contentType: file.type });
    if (uploadData) {
      const { data: urlData } = supabase.storage.from("facturas").getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      supplier_name: scannedData.supplier_name,
      total_cost: scannedData.total_cost,
      issue_date: scannedData.issue_date,
      due_date: scannedData.due_date,
      image_url: imageUrl,
      scanned_data: scannedData,
      status: "pending",
    })
    .select()
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  const invoiceItems = scannedData.items.map((item: { name: string; quantity: number; unit_cost: number | null; barcode?: string | null }) => ({
    invoice_id: invoice.id,
    product_id: null,
    raw_product_name: item.name,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
  }));

  await supabase.from("invoice_items").insert(invoiceItems);

  const { data: fullInvoice } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", invoice.id)
    .single();

  return NextResponse.json(fullInvoice, { status: 201 });
}
