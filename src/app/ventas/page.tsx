"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ProductWithStock } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Trash2, ShoppingCart, Barcode, AlertTriangle } from "lucide-react";

interface CartItem {
  product: ProductWithStock;
  quantity: number;
}

interface NewProductForm {
  name: string;
  barcode: string;
  initial_stock: string;
}

export default function VentasPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductWithStock[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>({ name: "", barcode: "", initial_stock: "" });
  const [pendingBarcode, setPendingBarcode] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleBarcodeInput = useCallback(
    async (code: string) => {
      const res = await fetch(`/api/productos?barcode=${encodeURIComponent(code)}`);
      const json = await res.json();
      const products: ProductWithStock[] = Array.isArray(json) ? json : [];

      if (products.length > 0) {
        addToCart(products[0]);
        setSearch("");
        setSearchResults([]);
      } else {
        setPendingBarcode(code);
        setNewProductForm((f) => ({ ...f, barcode: code, name: "" }));
        setShowNewProduct(true);
      }
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== searchRef.current) return;

      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        handleBarcodeInput(barcodeBuffer);
        setBarcodeBuffer("");
        setSearch("");
        return;
      }

      if (e.key.length === 1) {
        setBarcodeBuffer((prev) => prev + e.key);
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(""), 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer, handleBarcodeInput]);

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/productos?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function addToCart(product: ProductWithStock) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch("");
    setSearchResults([]);
    searchRef.current?.focus();
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) return removeFromCart(productId);
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)));
  }

  async function handleCreateProduct() {
    if (!newProductForm.name.trim()) return;
    const initialStock = newProductForm.initial_stock ? parseInt(newProductForm.initial_stock) : null;
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProductForm.name.trim(),
        barcode: newProductForm.barcode || null,
        initial_stock: initialStock,
      }),
    });
    if (!res.ok) {
      toast({ variant: "error", title: "Error al crear producto" });
      return;
    }
    const product = await res.json();
    const productWithStock: ProductWithStock = {
      ...product,
      current_stock: initialStock ?? 0,
    };
    addToCart(productWithStock);
    setShowNewProduct(false);
    setNewProductForm({ name: "", barcode: "", initial_stock: "" });
    setPendingBarcode("");
    toast({ variant: "success", title: "Producto creado y agregado al carrito" });
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      toast({ variant: "warning", title: "El carrito está vacío" });
      return;
    }
    const amount = parseFloat(totalAmount.replace(/\./g, "").replace(",", "."));
    if (!amount || amount <= 0) {
      toast({ variant: "warning", title: "Ingresá el monto total de la venta" });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        total_amount: amount,
        notes: notes || null,
      }),
    });

    if (!res.ok) {
      toast({ variant: "error", title: "Error al registrar la venta" });
      setSubmitting(false);
      return;
    }

    toast({ variant: "success", title: "Venta registrada", description: `${formatCurrency(amount)} - ${cart.length} producto(s)` });
    setCart([]);
    setTotalAmount("");
    setNotes("");
    searchRef.current?.focus();
    setSubmitting(false);
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrar Venta</h1>
          <p className="text-sm text-gray-500">Buscá productos por nombre o escaneá el código de barras</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o escanear código..."
              className="pl-9"
              autoComplete="off"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Buscando...</div>
            )}
          </div>

          {searchResults.length > 0 && (
            <Card>
              <CardContent className="p-0">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b last:border-0 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {p.barcode && <p className="text-xs text-gray-400">{p.barcode}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.current_stock < 0 ? (
                        <Badge variant="danger">Stock: {p.current_stock}</Badge>
                      ) : p.current_stock <= p.min_stock ? (
                        <Badge variant="warning">Stock: {p.current_stock}</Badge>
                      ) : (
                        <Badge variant="success">Stock: {p.current_stock}</Badge>
                      )}
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {search.length >= 2 && searchResults.length === 0 && !searching && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">No se encontró "{search}"</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewProductForm({ name: search, barcode: "", initial_stock: "" });
                      setShowNewProduct(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear producto
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Carrito</span>
                {totalItems > 0 && (
                  <Badge variant="default">{totalItems} unidad(es)</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Agregá productos para comenzar
                </p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                        {item.product.current_stock < 0 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Stock sin registrar
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Monto total de la venta *
                      </label>
                      <Input
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="Ej: 115000"
                        type="number"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Notas (opcional)
                      </label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observaciones..."
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full"
                      size="lg"
                    >
                      {submitting ? "Registrando..." : "Confirmar Venta"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Producto nuevo</DialogTitle>
            <DialogDescription>
              {pendingBarcode
                ? `Código de barras escaneado: ${pendingBarcode}. El producto no existe en el sistema.`
                : "El producto no existe. Completá los datos para crearlo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del producto *</label>
              <Input
                value={newProductForm.name}
                onChange={(e) => setNewProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Pastillas de freno Brembo"
                autoFocus
              />
            </div>
            {!pendingBarcode && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Código de barras (opcional)</label>
                <Input
                  value={newProductForm.barcode}
                  onChange={(e) => setNewProductForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="Escaneá o escribí el código"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Cantidad actual en el estante{" "}
                <span className="text-gray-400 font-normal">(opcional — si no sabés dejalo vacío)</span>
              </label>
              <Input
                value={newProductForm.initial_stock}
                onChange={(e) => setNewProductForm((f) => ({ ...f, initial_stock: e.target.value }))}
                placeholder="Ej: 8"
                type="number"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Si lo dejás vacío, el stock quedará en 0 y bajará al registrar la venta.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewProduct(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={!newProductForm.name.trim()}
                className="flex-1"
              >
                Crear y agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
