import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LowStockAlerts({ products, categories }) {
  const lowStockProducts = products.filter(p => p.quantity <= p.reorder_level);

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  return (
    <Card className="shadow-sm border border-border/60">
      <CardHeader className="border-b border-border/60 bg-orange-50/40">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Low Stock Alerts
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {lowStockProducts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground">All products are well stocked!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {lowStockProducts.map((product) => (
              <Link 
                key={product.id} 
                to={createPageUrl("Products")}
                className="block"
              >
                <div className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{getCategoryName(product.category_id)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{product.quantity}</p>
                    <p className="text-xs text-gray-500">Min: {product.reorder_level}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}