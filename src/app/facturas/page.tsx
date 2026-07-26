"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Invoice, InvoiceItem } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Upload, Camera, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight, Loader2, Truck, Tag } from "lucide-react";

export default function FacturasPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [confirmItems, setConfirmItems] = useState<(InvoiceItem & { product_name_edit: string; create_new: boolean; is_service: boolean })[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    const res = await fetch("/api/facturas");
    const data = await res.json();
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleFile(file: File) {
    setScanning(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/facturas/scan", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errMsg = "Intentá de nuevo";
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {}
      toast({ variant: "error", title: "Error al escanear", description: errMsg });
      setScanning(false);
      return;
    }

    const invoice: Invoice = await res.json();
    setCurrentInvoice(invoice);
    const productItems = (invoice.items || []).filter((i) => !i.is_service);
    setConfirmItems(
      (invoice.items || []).map((item) => ({
        ...item,
        product_name_edit: item.suggested_full_name || item.raw_product_name,
        create_new: true,
        is_service: item.is_service,
      }))
    );
    setShowConfirm(true);
    setScanning(false);
    toast({ variant: "success", title: "Factura escaneada", description: `${productItems.length} producto(s) + ${(invoice.items?.length || 0) - productItems.length} servicio(s)` });
    loadInvoices();
  }

  async function handleConfirm() {
    if (!currentInvoice) return;
    setConfirming(true);

    const res = await fetch(`/api/facturas/${currentInvoice.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: confirmItems.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          raw_product_name: item.raw_product_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          is_service: item.is_service,
          create_product: item.create_new && !item.product_id && !item.is_service,
          product_name: item.product_name_edit,
          brand: item.brand,
          product_code: item.product_code,
        })),
      }),
    });

    if (!res.ok) {
      toast({ variant: "error", title: "Error al confirmar factura" });
      setConfirming(false);
      return;
    }

    toast({ variant: "success", title: "Factura confirmada", description: "Stock actualizado correctamente" });
    setShowConfirm(false);
    setCurrentInvoice(null);
    loadInvoices();
    setConfirming(false);
  }

  const statusBadge = (status: Invoice["status"]) => {
    if (status === "confirmed") return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Confirmada</Badge>;
    if (status === "cancelled") return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
    return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="text-sm text-gray-500">Escanear facturas de proveedores con IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir PDF / imagen
          </Button>
          <Button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.capture = "environment";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
            disabled={scanning}
          >
            {scanning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Escaneando...</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" />Sacar foto</>
            )}
          </Button>
        </div>
      </div>

      {scanning && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6 flex items-center gap-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <div>
              <p className="font-medium text-blue-900">Analizando factura con IA...</p>
              <p className="text-sm text-blue-600">Esto puede tomar unos segundos</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay facturas cargadas aún</p>
              <p className="mt-1">Sacá una foto o subí un PDF para comenzar</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="border-b last:border-0">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
                  onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
                >
                  <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.supplier_name || "Proveedor desconocido"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {invoice.invoice_number ? `#${invoice.invoice_number} · ` : ""}{formatDate(invoice.created_at)}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {invoice.total_cost ? formatCurrency(invoice.total_cost) : "—"}
                    </div>
                    <div>
                      {invoice.due_date && (
                        <p className="text-xs text-gray-500">Vence: {formatDate(invoice.due_date)}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {statusBadge(invoice.status)}
                      {expandedId === invoice.id ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedId === invoice.id && invoice.items && (
                  <div className="px-5 pb-4 bg-gray-50 border-t">
                    <table className="w-full text-sm mt-3">
                      <thead>
                        <tr>
                          <th className="text-left py-2 text-gray-500 font-medium">Producto</th>
                          <th className="text-center py-2 text-gray-500 font-medium">Cantidad</th>
                          <th className="text-right py-2 text-gray-500 font-medium">Costo unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 text-gray-900">{item.raw_product_name}</td>
                            <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                            <td className="py-2 text-right text-gray-600">
                              {item.unit_cost ? formatCurrency(item.unit_cost) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {invoice.status === "pending" && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCurrentInvoice(invoice);
                            setConfirmItems(
                              (invoice.items || []).map((item) => ({
                                ...item,
                                product_name_edit: item.suggested_full_name || item.raw_product_name,
                                create_new: true,
                                is_service: item.is_service,
                              }))
                            );
                            setShowConfirm(true);
                          }}
                        >
                          Revisar y confirmar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar factura escaneada</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span><span className="font-medium text-gray-700">Proveedor:</span> {currentInvoice?.supplier_name || "Sin detectar"}</span>
                  {currentInvoice?.invoice_number && (
                    <span><span className="font-medium text-gray-700">Nro:</span> {currentInvoice.invoice_number}</span>
                  )}
                  {currentInvoice?.issue_date && (
                    <span><span className="font-medium text-gray-700">Fecha:</span> {formatDate(currentInvoice.issue_date)}</span>
                  )}
                  {currentInvoice?.due_date && (
                    <span><span className="font-medium text-gray-700">Vence:</span> {formatDate(currentInvoice.due_date)}</span>
                  )}
                  {currentInvoice?.total_cost && (
                    <span><span className="font-medium text-gray-700">Total:</span> {formatCurrency(currentInvoice.total_cost)}</span>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Revisá los productos antes de confirmar. Los servicios (flete, etc.) no suman al stock. Podés cambiar el tipo con el botón.
            </p>

            {confirmItems.map((item, i) => (
              <div
                key={item.id}
                className={`p-3 border rounded-lg space-y-2 ${item.is_service ? "bg-gray-50 border-gray-200 opacity-75" : "bg-white"}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {(item.brand || item.product_code) && (
                      <div className="flex gap-2 mb-1">
                        {item.brand && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            <Tag className="h-3 w-3" />{item.brand}
                          </span>
                        )}
                        {item.product_code && (
                          <span className="text-xs text-gray-400 font-mono">{item.product_code}</span>
                        )}
                      </div>
                    )}
                    {!item.is_service && (
                      <p className="text-xs text-gray-400 mb-1">
                        En factura: <span className="font-mono">{item.raw_product_name}</span>
                      </p>
                    )}
                    <div className="relative">
                      <Input
                        value={item.product_name_edit}
                        onChange={(e) =>
                          setConfirmItems((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, product_name_edit: e.target.value } : x))
                          )
                        }
                        className="text-sm pr-8"
                        disabled={item.is_service}
                        placeholder="Nombre en sistema..."
                      />
                      {!item.is_service && item.suggested_full_name && item.product_name_edit !== item.suggested_full_name && (
                        <button
                          onClick={() =>
                            setConfirmItems((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, product_name_edit: item.suggested_full_name! } : x))
                            )
                          }
                          title="Restaurar sugerencia de IA"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                        >
                          ↩
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-16 shrink-0">
                    <p className="text-xs text-gray-400 text-center mb-1">Cant.</p>
                    <Input
                      value={item.quantity}
                      onChange={(e) =>
                        setConfirmItems((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))
                        )
                      }
                      type="number"
                      min="1"
                      className="text-sm text-center"
                      disabled={item.is_service}
                    />
                  </div>

                  <button
                    onClick={() =>
                      setConfirmItems((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, is_service: !x.is_service } : x))
                      )
                    }
                    title={item.is_service ? "Marcar como producto" : "Marcar como servicio"}
                    className={`shrink-0 mt-5 p-1.5 rounded border transition-colors ${
                      item.is_service
                        ? "bg-gray-200 border-gray-300 text-gray-500"
                        : "border-gray-200 text-gray-300 hover:text-amber-500 hover:border-amber-300"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {item.unit_price != null && (
                    <span>P. lista: <span className="font-medium text-gray-700">{formatCurrency(item.unit_price)}</span></span>
                  )}
                  {item.discount_pct != null && (
                    <span className="text-red-600">DTO: {item.discount_pct}%</span>
                  )}
                  {item.bonif_pct != null && (
                    <span className="text-red-600">BONIF: {item.bonif_pct}%</span>
                  )}
                  {item.unit_cost != null && (
                    <span>Costo unit.: <span className="font-semibold text-gray-900">{formatCurrency(item.unit_cost)}</span></span>
                  )}
                  {item.item_total != null && (
                    <span>Total renglón: <span className="font-semibold text-gray-900">{formatCurrency(item.item_total)}</span></span>
                  )}
                  {item.is_service && (
                    <span className="ml-auto inline-flex items-center gap-1 text-amber-600 font-medium">
                      <Truck className="h-3 w-3" /> Servicio — no suma al stock
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={confirming} className="flex-1" variant="success">
                {confirming ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirmando...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Confirmar y actualizar stock</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
