export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  description: string | null;
  min_stock: number;
  created_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_change: number;
  movement_type: "entry" | "exit" | "adjustment" | "invoice_entry";
  notes: string | null;
  invoice_id: string | null;
  sale_id: string | null;
  created_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Invoice {
  id: string;
  supplier_name: string | null;
  invoice_number: string | null;
  total_cost: number | null;
  subtotal: number | null;
  issue_date: string | null;
  due_date: string | null;
  image_url: string | null;
  scanned_data: ScannedInvoiceData | null;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  raw_product_name: string;
  brand: string | null;
  product_code: string | null;
  quantity: number;
  unit_price: number | null;
  discount_pct: number | null;
  bonif_pct: number | null;
  unit_cost: number | null;
  item_total: number | null;
  is_service: boolean;
  created_at: string;
  product?: Product | null;
}

export interface ScannedInvoiceData {
  supplier_name: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  total_cost: number | null;
  items: {
    brand: string | null;
    code: string | null;
    name: string;
    quantity: number;
    unit_price: number | null;
    discount_pct: number | null;
    bonif_pct: number | null;
    unit_cost: number | null;
    item_total: number | null;
    is_service: boolean;
  }[];
}

export interface OrderItem {
  product: ProductWithStock;
  suggested_quantity: number;
}
