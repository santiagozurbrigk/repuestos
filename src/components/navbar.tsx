"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Package, FileText, ClipboardList, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/pedido", label: "Pedido", icon: ClipboardList },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 text-white h-screen w-56 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg">Repuestos</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Sistema de stock</p>
      </div>

      <div className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
