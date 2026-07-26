import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SCAN_PROMPT = `Analizá esta factura de proveedor de repuestos automotrices. Extraé toda la información disponible y devolvé un JSON con exactamente este formato:

{
  "supplier_name": "razón social del proveedor o null",
  "invoice_number": "número de factura (ej: 00031-00001562) o null",
  "issue_date": "fecha de emisión en formato YYYY-MM-DD o null",
  "due_date": "fecha de vencimiento más próxima en formato YYYY-MM-DD o null",
  "subtotal": número subtotal antes de impuestos o null,
  "total_cost": número TOTAL final de la factura (incluyendo impuestos) o null,
  "items": [
    {
      "brand": "marca del producto (columna MARCA) o null",
      "code": "código o referencia del producto (columna CODIGO) o null",
      "name": "descripción del artículo (columna ARTICULO)",
      "quantity": cantidad como número entero,
      "unit_price": precio unitario de lista ANTES de descuentos (columna P.UNIT) como número o null,
      "discount_pct": porcentaje de descuento DTO como número sin el símbolo % (ej: 45 para 45%) o null,
      "bonif_pct": porcentaje de bonificación adicional BONIF como número sin el símbolo % o null,
      "unit_cost": precio unitario final que realmente paga el comprador después de TODOS los descuentos como número o null,
      "item_total": importe total del renglón como número o null,
      "is_service": true si es flete, envío, transporte, cargo financiero u otro concepto que NO es un producto físico de stock; false si es un producto
    }
  ]
}

Reglas importantes:
- Devolvé SOLO el JSON puro, sin texto adicional, sin markdown, sin bloques de código
- Si un campo no está disponible, usá null
- La cantidad siempre debe ser un número entero positivo
- Todos los importes son números decimales sin símbolo de moneda ni puntos de miles
- Para unit_cost calculá: unit_price × (1 - discount_pct/100) × (1 - bonif_pct/100)
- Marcá is_service: true para FLETE, ENVIO, TRANSPORTE, SEGURO y cualquier servicio
- Incluí TODOS los renglones de la factura incluidos fletes y servicios
- Para due_date, si hay varios vencimientos usá el más próximo`;

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
      invoice_number: scannedData.invoice_number ?? null,
      total_cost: scannedData.total_cost,
      subtotal: scannedData.subtotal ?? null,
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

  type ScannedItem = {
    brand?: string | null;
    code?: string | null;
    name: string;
    quantity: number;
    unit_price?: number | null;
    discount_pct?: number | null;
    bonif_pct?: number | null;
    unit_cost?: number | null;
    item_total?: number | null;
    is_service?: boolean;
  };

  const invoiceItems = scannedData.items.map((item: ScannedItem) => ({
    invoice_id: invoice.id,
    product_id: null,
    raw_product_name: item.name,
    brand: item.brand ?? null,
    product_code: item.code ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price ?? null,
    discount_pct: item.discount_pct ?? null,
    bonif_pct: item.bonif_pct ?? null,
    unit_cost: item.unit_cost ?? null,
    item_total: item.item_total ?? null,
    is_service: item.is_service ?? false,
  }));

  await supabase.from("invoice_items").insert(invoiceItems);

  const { data: fullInvoice } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", invoice.id)
    .single();

  return NextResponse.json(fullInvoice, { status: 201 });
}
