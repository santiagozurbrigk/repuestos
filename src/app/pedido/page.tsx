"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductWithStock } from "@/types";
import { ClipboardList, AlertTriangle, TrendingDown, Printer, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PedidoPage() {
  const [items, setItems] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/pedido");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  const negative = items.filter((p) => p.current_stock < 0);
  const low = items.filter((p) => p.current_stock >= 0 && p.current_stock <= p.min_stock);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Pedido</h1>
            <p className="text-sm text-gray-500">Generada automáticamente desde el stock</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button variant="outline" onClick={handlePrint} size="sm">
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Lista de Pedido</h1>
        <p className="text-sm text-gray-500">Generada el {formatDate(new Date())}</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Todo el stock está en orden</p>
            <p className="text-sm text-gray-400 mt-1">No hay productos que necesiten reposición</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {negative.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Stock sin registrar ({negative.length})
                </CardTitle>
                <p className="text-sm text-red-600">
                  Estos productos fueron vendidos pero nunca se registró su entrada al sistema.
                  Pedirlos primero.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-red-50">
                        <th className="text-left px-4 py-2.5 font-medium text-red-700">Producto</th>
                        <th className="text-center px-4 py-2.5 font-medium text-red-700">Stock</th>
                        <th className="hidden sm:table-cell text-center px-4 py-2.5 font-medium text-red-700">Mínimo</th>
                        <th className="text-center px-4 py-2.5 font-medium text-red-700">Pedir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negative.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="danger">{p.current_stock}</Badge>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-500">{p.min_stock}</td>
                          <td className="px-4 py-3 text-center font-semibold text-red-700">
                            {p.min_stock - p.current_stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {low.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <TrendingDown className="h-5 w-5" />
                  Stock bajo ({low.length})
                </CardTitle>
                <p className="text-sm text-amber-600">
                  Estos productos están por debajo del mínimo configurado.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-amber-50">
                        <th className="text-left px-4 py-2.5 font-medium text-amber-700">Producto</th>
                        <th className="text-center px-4 py-2.5 font-medium text-amber-700">Stock</th>
                        <th className="hidden sm:table-cell text-center px-4 py-2.5 font-medium text-amber-700">Mínimo</th>
                        <th className="text-center px-4 py-2.5 font-medium text-amber-700">Pedir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {low.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="warning">{p.current_stock}</Badge>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-500">{p.min_stock}</td>
                          <td className="px-4 py-3 text-center font-semibold text-amber-700">
                            {p.min_stock - p.current_stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
