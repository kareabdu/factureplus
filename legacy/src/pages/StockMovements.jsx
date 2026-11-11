import React, { useState, useEffect } from "react";
import { StockMovement, Product } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [movementsData, productsData] = await Promise.all([
      StockMovement.list('-created_date'),
      Product.list()
    ]);
    setMovements(movementsData);
    setProducts(productsData);
    setIsLoading(false);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'in': return <ArrowUpCircle className="w-5 h-5 text-emerald-600" />;
      case 'out': return <ArrowDownCircle className="w-5 h-5 text-red-600" />;
      case 'adjustment': return <RefreshCw className="w-5 h-5 text-blue-600" />;
      default: return null;
    }
  };

  const getBadgeColor = (type) => {
    switch(type) {
      case 'in': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'out': return 'bg-red-100 text-red-800 border-red-200';
      case 'adjustment': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return '';
    }
  };

  const filteredMovements = movements.filter(movement => {
    // Ignore les entrées de réinjection de stock (suppression/réduction d'article
    // sur une facture) : ce ne sont pas de vrais mouvements d'approvisionnement.
    if (movement.movement_type === "in" && movement.reason === "Ajustement quantité / suppression article") return false;
    const matchesSearch = movement.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || movement.movement_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 hidden md:block">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-2">Mouvements de stock</h1>
          <p className="text-muted-foreground">Suivez tous les mouvements d'inventaire</p>
        </div>

        <Card className="shadow-sm border border-border/60 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <SearchInput
                className="flex-1"
                placeholder="Search by product or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                iconClassName="w-5 h-5"
                desktopClassName="md:pl-10 md:bg-card md:border md:rounded-md"
              />
              
              <div className="flex items-center gap-2 md:w-64">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="adjustment">Adjustments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Movement History ({filteredMovements.length} records)</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="mt-4 text-muted-foreground">Loading movements...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No movements found</p>
            ) : (
              <div className="space-y-3">
                {filteredMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center gap-4 p-4 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      {getIcon(movement.movement_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{movement.product_name}</p>
                        <Badge className={`${getBadgeColor(movement.movement_type)} border text-xs`}>
                          {movement.movement_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{movement.reason}</p>
                      {movement.reference && (
                        <p className="text-xs text-muted-foreground mt-1">Ref: {movement.reference}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {format(new Date(movement.created_date), 'MMM d, yyyy HH:mm')} • By {movement.created_by}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-2xl font-bold ${
                          movement.movement_type === 'in' ? 'text-emerald-600' :
                          movement.movement_type === 'out' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                          {movement.quantity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {movement.previous_quantity} → {movement.new_quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}