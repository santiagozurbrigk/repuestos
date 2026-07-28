"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ProductWithStock } from "@/types";
import { Package, Search, Plus, AlertTriangle, TrendingDown, Edit2, ArrowUpDown } from "lucide-react";

type FilterType = "todos" | "bajo" | "negativo";

export default function StockPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("todos");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", barcode: "", min_stock: "1", initial_stock: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "todos") params.set("filter", filter);
    const res = await fetch(`/api/stock?${params}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  async function handleCreateProduct() {
    if (!newProduct.name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name.trim(),
        barcode: newProduct.barcode || null,
        min_stock: parseInt(newProduct.min_stock) || 1,
        initial_stock: newProduct.initial_stock ? parseInt(newProduct.initial_stock) : null,
      }),
    });
    if (!res.ok) {
      toast({ variant: "error", title: "Error al crear producto" });
    } else {
      toast({ variant: "success", title: "Producto creado" });
      setShowNewProduct(false);
      setNewProduct({ name: "", barcode: "", min_stock: "1", initial_stock: "" });
      loadProducts();
    }
    setSubmitting(false);
  }

  async function handleAdjust() {
    if (!selectedProduct || !adjustQty) return;
    setSubmitting(true);
    const newQty = parseInt(adjustQty);
    const currentQty = selectedProduct.current_stock;
    const delta = newQty - currentQty;

    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        quantity_change: delta,
        movement_type: "adjustment",
        notes: adjustNote || `Ajuste manual: de ${currentQty} a ${newQty}`,
      }),
    });

    if (!res.ok) {
      toast({ variant: "error", title: "Error al ajustar stock" });
    } else {
      toast({ variant: "success", title: "Stock ajustado correctamente" });
      setShowAdjust(false);
      setAdjustQty("");
      setAdjustNote("");
      setSelectedProduct(null);
      loadProducts();
    }
    setSubmitting(false);
  }

  const stockBadge = (p: ProductWithStock) => {
    if (p.current_stock < 0) return <Badge variant="danger">{p.current_stock}</Badge>;
    if (p.current_stock <= p.min_stock) return <Badge variant="warning">{p.current_stock}</Badge>;
    return <Badge variant="success">{p.current_stock}</Badge>;
  };

  const negativeCount = products.filter((p) => p.current_stock < 0).length;
  const lowCount = products.filter((p) => p.current_stock >= 0 && p.current_stock <= p.min_stock).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
            <p className="text-sm text-gray-500">Gestión de productos e inventario</p>
          </div>
        </div>
        <Button onClick={() => setShowNewProduct(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo producto
        </Button>
      </div>

      {(negativeCount > 0 || lowCount > 0) && (
        <div className="flex gap-3 mb-6">
          {negativeCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700 font-medium">{negativeCount} producto(s) con stock sin registrar</span>
            </div>
          )}
          {lowCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">{lowCount} producto(s) con stock bajo</span>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(["todos", "bajo", "negativo"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f === "todos" ? "Todos" : f === "bajo" ? "Stock bajo" : "Sin registrar"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No se encontraron productos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Marca</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Código</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                    <th className="hidden sm:table-cell text-center px-4 py-3 font-medium text-gray-600">Mínimo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.current_stock < 0 && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Sin registrar
                            </p>
                          )}
                          <div className="sm:hidden flex flex-wrap gap-x-2 mt-0.5">
                            {p.brand && <span className="text-xs text-gray-500">{p.brand}</span>}
                            {(p.product_code || p.barcode) && (
                              <span className="text-xs text-gray-400 font-mono">{p.product_code || p.barcode}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-xs text-gray-600">{p.brand || "—"}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-400 font-mono text-xs">{p.product_code || p.barcode || "—"}</td>
                      <td className="px-4 py-3 text-center">{stockBadge(p)}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-500">{p.min_stock}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustQty(p.current_stock.toString());
                            setShowAdjust(true);
                          }}
                        >
                          <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                          Ajustar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>Completá los datos del producto a agregar al sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Kit de distribución Gates"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Código de barras</label>
              <Input
                value={newProduct.barcode}
                onChange={(e) => setNewProduct((p) => ({ ...p, barcode: e.target.value }))}
                placeholder="Escaneá o escribí el código"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Stock inicial</label>
                <Input
                  value={newProduct.initial_stock}
                  onChange={(e) => setNewProduct((p) => ({ ...p, initial_stock: e.target.value }))}
                  placeholder="Ej: 5"
                  type="number"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Stock mínimo</label>
                <Input
                  value={newProduct.min_stock}
                  onChange={(e) => setNewProduct((p) => ({ ...p, min_stock: e.target.value }))}
                  placeholder="1"
                  type="number"
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewProduct(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateProduct} disabled={!newProduct.name.trim() || submitting} className="flex-1">
                {submitting ? "Creando..." : "Crear producto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>{selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Stock actual: </span>
                <span className="font-semibold">{selectedProduct.current_stock}</span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nueva cantidad *</label>
                <Input
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  type="number"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Motivo (opcional)</label>
                <Input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Ej: Conteo físico, rotura, etc."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAdjust(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleAdjust} disabled={!adjustQty || submitting} className="flex-1">
                  {submitting ? "Ajustando..." : "Confirmar ajuste"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
