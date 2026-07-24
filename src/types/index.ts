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
  total_cost: number | null;
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
  quantity: number;
  unit_cost: number | null;
  created_at: string;
  product?: Product | null;
}

export interface ScannedInvoiceData {
  supplier_name: string | null;
  issue_date: string | null;
  due_date: string | null;
  total_cost: number | null;
  items: {
    name: string;
    quantity: number;
    unit_cost: number | null;
    barcode?: string | null;
  }[];
  raw_text?: string;
}

export interface OrderItem {
  product: ProductWithStock;
  suggested_quantity: number;
}
