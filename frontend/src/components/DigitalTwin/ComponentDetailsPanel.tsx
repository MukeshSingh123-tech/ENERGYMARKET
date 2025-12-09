import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, Battery, Building2, Car, Server, 
  DollarSign, Activity, Wallet, Copy, Check
} from 'lucide-react';
import { useState } from 'react';
import { 
  NANOGRID_ADDRESSES, 
  INFRASTRUCTURE_ADDRESSES, 
  ENERGY_PRICING 
} from '@/blockchain/config';

interface NanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
}

interface ComponentDetailsPanelProps {
  nanogrids: NanogridData[];
  stats: {
    totalSolar: number;
    totalLoad: number;
    avgBattery: number;
    batteryCharge: number;
    evCharge: number;
    gridExport: number;
    gridImport: number;
    netPower: number;
  };
  selectedNanogrid: NanogridData | null;
  onSelectNanogrid: (nanogrid: NanogridData | null) => void;
}

const AddressDisplay = ({ label, address }: { label: string; address: string }) => {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div 
        className="flex items-center gap-2 bg-muted/50 p-2 rounded cursor-pointer hover:bg-muted transition-colors"
        onClick={copyAddress}
      >
        <code className="text-xs font-mono flex-1 truncate">{address}</code>
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

const PriceDisplay = ({ label, price, unit = "kWh" }: { label: string; price: number; unit?: string }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="font-mono font-medium text-green-500">${price.toFixed(2)}/{unit}</span>
  </div>
);

export const ComponentDetailsPanel = ({ 
  nanogrids, 
  stats, 
  selectedNanogrid,
  onSelectNanogrid 
}: ComponentDetailsPanelProps) => {
  const nanogridAddressMap: { [key: number]: string } = {
    1: NANOGRID_ADDRESSES.nanogrid1,
    2: NANOGRID_ADDRESSES.nanogrid2,
    3: NANOGRID_ADDRESSES.nanogrid3,
    4: NANOGRID_ADDRESSES.nanogrid4,
    5: NANOGRID_ADDRESSES.nanogrid5,
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Server className="h-5 w-5" />
          System Components
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="nanogrids" className="w-full">
          <TabsList className="w-full grid grid-cols-4 rounded-none">
            <TabsTrigger value="nanogrids" className="text-xs">Nanogrids</TabsTrigger>
            <TabsTrigger value="infrastructure" className="text-xs">Infrastructure</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs">Accounts</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px]">
            {/* Nanogrids Tab */}
            <TabsContent value="nanogrids" className="p-4 m-0 space-y-3">
              {nanogrids.map((ng) => (
                <div
                  key={ng.nanogrid_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedNanogrid?.nanogrid_id === ng.nanogrid_id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onSelectNanogrid(
                    selectedNanogrid?.nanogrid_id === ng.nanogrid_id ? null : ng
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Nanogrid {ng.nanogrid_id}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ng.solar_output > ng.load_demand ? 'Surplus' : 'Deficit'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <div className="text-muted-foreground">Generation</div>
                      <div className="font-medium text-yellow-500">{ng.solar_output.toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Load</div>
                      <div className="font-medium text-red-500">{ng.load_demand.toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Battery</div>
                      <div className="font-medium text-green-500">{ng.battery_soc.toFixed(0)}%</div>
                    </div>
                  </div>

                  <AddressDisplay 
                    label="Wallet Address" 
                    address={nanogridAddressMap[ng.nanogrid_id] || ng.address} 
                  />
                  
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-muted-foreground">Revenue Rate</span>
                    <span className="text-green-500">
                      ${((ng.solar_output - ng.load_demand) * ENERGY_PRICING.stateGrid.sellPrice).toFixed(3)}/hr
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Infrastructure Tab */}
            <TabsContent value="infrastructure" className="p-4 m-0 space-y-4">
              {/* State Grid */}
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">State Grid</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {stats.gridExport > 0 ? 'Exporting' : 'Importing'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Export Power</div>
                    <div className="font-medium text-emerald-500">{stats.gridExport.toFixed(1)} kW</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Import Power</div>
                    <div className="font-medium text-red-500">{stats.gridImport.toFixed(1)} kW</div>
                  </div>
                </div>

                <AddressDisplay label="Wallet Address" address={INFRASTRUCTURE_ADDRESSES.stateGrid} />
                
                <Separator className="my-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sell Price</span>
                  <span className="text-green-500">${ENERGY_PRICING.stateGrid.sellPrice}/kWh</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Buy Price</span>
                  <span className="text-red-500">${ENERGY_PRICING.stateGrid.buyPrice}/kWh</span>
                </div>
              </div>

              {/* EV Charging Station */}
              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">EV Charging Station</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {stats.evCharge > 0.5 ? 'Active' : 'Standby'}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground">Charging Power</div>
                  <div className="font-medium text-blue-500">{stats.evCharge.toFixed(1)} kW</div>
                </div>

                <AddressDisplay label="Wallet Address" address={INFRASTRUCTURE_ADDRESSES.evStation} />
                
                <Separator className="my-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sell Price</span>
                  <span className="text-green-500">${ENERGY_PRICING.evStation.sellPrice}/kWh</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revenue Rate</span>
                  <span className="text-green-500">
                    ${(stats.evCharge * ENERGY_PRICING.evStation.sellPrice).toFixed(3)}/hr
                  </span>
                </div>
              </div>

              {/* Central Battery */}
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Battery className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Central Battery Storage</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {stats.batteryCharge > 0 ? 'Charging' : 'Idle'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground">State of Charge</div>
                    <div className="font-medium text-green-500">{stats.avgBattery.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Charge Rate</div>
                    <div className="font-medium text-green-500">+{stats.batteryCharge.toFixed(1)} kW</div>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div
                    className="h-2 rounded-full transition-all bg-green-500"
                    style={{ width: `${stats.avgBattery}%` }}
                  />
                </div>

                <AddressDisplay label="Wallet Address" address={INFRASTRUCTURE_ADDRESSES.centralBattery} />
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="p-4 m-0 space-y-4">
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Energy Pricing</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">State Grid</div>
                    <PriceDisplay label="Sell to Grid" price={ENERGY_PRICING.stateGrid.sellPrice} />
                    <PriceDisplay label="Buy from Grid" price={ENERGY_PRICING.stateGrid.buyPrice} />
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">EV Charging</div>
                    <PriceDisplay label="Sell to EV" price={ENERGY_PRICING.evStation.sellPrice} />
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">P2P Trading</div>
                    <PriceDisplay label="Base Price" price={ENERGY_PRICING.p2pTrade.basePrice} />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Current Revenue Rates</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grid Export</span>
                    <span className="text-green-500">
                      ${(stats.gridExport * ENERGY_PRICING.stateGrid.sellPrice).toFixed(3)}/hr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EV Charging</span>
                    <span className="text-green-500">
                      ${(stats.evCharge * ENERGY_PRICING.evStation.sellPrice).toFixed(3)}/hr
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Revenue</span>
                    <span className="text-green-500">
                      ${(
                        stats.gridExport * ENERGY_PRICING.stateGrid.sellPrice +
                        stats.evCharge * ENERGY_PRICING.evStation.sellPrice
                      ).toFixed(3)}/hr
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="p-4 m-0 space-y-4">
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-medium">System Accounts</span>
                </div>

                <div className="space-y-3">
                  <AddressDisplay label="Owner (Admin)" address={NANOGRID_ADDRESSES.owner} />
                  <AddressDisplay label="Prosumer (Trading)" address={NANOGRID_ADDRESSES.prosumer} />
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="text-sm font-medium mb-3">Nanogrid Accounts</div>
                <div className="space-y-2">
                  <AddressDisplay label="Nanogrid 1" address={NANOGRID_ADDRESSES.nanogrid1} />
                  <AddressDisplay label="Nanogrid 2" address={NANOGRID_ADDRESSES.nanogrid2} />
                  <AddressDisplay label="Nanogrid 3" address={NANOGRID_ADDRESSES.nanogrid3} />
                  <AddressDisplay label="Nanogrid 4" address={NANOGRID_ADDRESSES.nanogrid4} />
                  <AddressDisplay label="Nanogrid 5" address={NANOGRID_ADDRESSES.nanogrid5} />
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="text-sm font-medium mb-3">Infrastructure Accounts</div>
                <div className="space-y-2">
                  <AddressDisplay label="State Grid" address={INFRASTRUCTURE_ADDRESSES.stateGrid} />
                  <AddressDisplay label="EV Station" address={INFRASTRUCTURE_ADDRESSES.evStation} />
                  <AddressDisplay label="Central Battery" address={INFRASTRUCTURE_ADDRESSES.centralBattery} />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};