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
import { FileText, Upload, Camera, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export default function FacturasPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [confirmItems, setConfirmItems] = useState<(InvoiceItem & { product_name_edit: string; create_new: boolean })[]>([]);
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
    setConfirmItems(
      (invoice.items || []).map((item) => ({
        ...item,
        product_name_edit: item.raw_product_name,
        create_new: true,
      }))
    );
    setShowConfirm(true);
    setScanning(false);
    toast({ variant: "success", title: "Factura escaneada", description: `${invoice.items?.length || 0} productos detectados` });
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
          create_product: item.create_new && !item.product_id,
          product_name: item.product_name_edit,
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
                        {formatDate(invoice.created_at)}
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
                                product_name_edit: item.raw_product_name,
                                create_new: true,
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar factura escaneada</DialogTitle>
            <DialogDescription>
              Proveedor: {currentInvoice?.supplier_name || "Sin detectar"} —{" "}
              {currentInvoice?.total_cost ? formatCurrency(currentInvoice.total_cost) : "Monto no detectado"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Revisá y corregí los productos detectados antes de confirmar. Al confirmar, se sumará el stock automáticamente.
            </p>

            {confirmItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Input
                    value={item.product_name_edit}
                    onChange={(e) =>
                      setConfirmItems((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, product_name_edit: e.target.value } : x))
                      )
                    }
                    className="text-sm"
                  />
                </div>
                <div className="w-20">
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
                  />
                </div>
                <Badge variant="default">
                  {item.unit_cost ? formatCurrency(item.unit_cost) : "Sin precio"}
                </Badge>
              </div>
            ))}

            <div className="flex gap-2 pt-4">
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
