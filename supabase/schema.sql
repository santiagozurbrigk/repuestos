-- Productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  min_stock INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Movimientos de stock (entradas y salidas)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'invoice_entry')),
  notes TEXT,
  invoice_id UUID,
  sale_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ventas
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items de ventas
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facturas de proveedores
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT,
  total_cost NUMERIC,
  issue_date DATE,
  due_date DATE,
  image_url TEXT,
  scanned_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items de facturas
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  raw_product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign keys diferidas
ALTER TABLE stock_movements ADD CONSTRAINT fk_sale FOREIGN KEY (sale_id) REFERENCES sales(id);
ALTER TABLE stock_movements ADD CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- Vista de stock actual por producto
CREATE VIEW current_stock AS
SELECT
  p.id,
  p.barcode,
  p.name,
  p.description,
  p.min_stock,
  p.created_at,
  COALESCE(SUM(sm.quantity_change), 0)::INTEGER AS current_stock
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id;

-- Indexes para búsquedas
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_sales_created ON sales(created_at DESC);

-- Storage bucket para imágenes de facturas
INSERT INTO storage.buckets (id, name, public) VALUES ('facturas', 'facturas', true);

-- Política de acceso al storage (acceso público de lectura, escritura autenticada)
CREATE POLICY "Facturas públicas de lectura" ON storage.objects
  FOR SELECT USING (bucket_id = 'facturas');

CREATE POLICY "Facturas escritura" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'facturas');
