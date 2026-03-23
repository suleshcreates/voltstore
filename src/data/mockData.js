// VoltStore — Real product data for Raju's electrical shop in Nagpur

export const products = [
  { id: 1, name: 'MCB 32A', brand: 'Havells', category: 'Circuit Breakers', stock: 4, unit: 'units', reorderAt: 20, price: 285, status: 'critical' },
  { id: 2, name: '4mm Copper Wire', brand: 'Finolex', category: 'Wires', stock: 38, unit: 'm', reorderAt: 50, price: 60, priceUnit: '/m', status: 'hot' },
  { id: 3, name: 'LED Bulb 9W', brand: 'Syska', category: 'Lighting', stock: 72, unit: 'units', reorderAt: 30, price: 35, status: 'healthy' },
  { id: 4, name: '3-pin Socket', brand: 'Anchor', category: 'Switches', stock: 15, unit: 'units', reorderAt: 25, price: 35, status: 'warning' },
  { id: 5, name: 'MCB 16A', brand: 'Havells', category: 'Circuit Breakers', stock: 29, unit: 'units', reorderAt: 15, price: 210, status: 'healthy' },
  { id: 6, name: 'LED Batten 20W', brand: 'Philips', category: 'Lighting', stock: 8, unit: 'units', reorderAt: 15, price: 280, status: 'warning' },
  { id: 7, name: 'PVC Tape 19mm', brand: 'Anchor', category: 'Accessories', stock: 55, unit: 'units', reorderAt: 40, price: 15, status: 'healthy' },
  { id: 8, name: '6mm Copper Wire', brand: 'Polycab', category: 'Wires', stock: 12, unit: 'm', reorderAt: 30, price: 95, priceUnit: '/m', status: 'critical' },
  { id: 9, name: '3-pin Plug', brand: 'Anchor', category: 'Switches', stock: 6, unit: 'units', reorderAt: 30, price: 22, status: 'critical' },
  { id: 10, name: 'DB Box 8-way', brand: 'Legrand', category: 'Panels', stock: 11, unit: 'units', reorderAt: 8, price: 1250, status: 'healthy' },
  { id: 11, name: 'Ceiling Fan 48"', brand: 'Crompton', category: 'Fans', stock: 7, unit: 'units', reorderAt: 5, price: 2800, status: 'healthy' },
];

export const categories = ['Circuit Breakers', 'Wires', 'Lighting', 'Switches', 'Accessories', 'Panels', 'Fans'];

export const todayStats = {
  sales: 18420,
  lowStockCount: 4,
  stockValue: 482000,
  topSeller: { name: '4mm Copper Wire', brand: 'Finolex', revenue: 8520, units: 142 },
};

export const topSellersWeek = [
  { rank: 1, name: '4mm Copper Wire', brand: 'Finolex', units: 142, revenue: 8520 },
  { rank: 2, name: 'MCB 16A', brand: 'Havells', units: 38, revenue: 7980 },
  { rank: 3, name: 'LED Bulb 9W', brand: 'Syska', units: 55, revenue: 1925 },
  { rank: 4, name: 'PVC Tape', brand: 'Anchor', units: 42, revenue: 630 },
  { rank: 5, name: '3-pin Socket', brand: 'Anchor', units: 28, revenue: 980 },
];

export const alerts = [
  {
    id: 1,
    type: 'critical',
    icon: '⚠️',
    badge: 'CRITICAL',
    title: 'MCB 32A Havells — Critically Low Stock',
    body: 'Only 4 units remaining. Average daily sales: 3 units. You\'ll run out by tomorrow evening. Recommended reorder: 25 units.',
    action: 'Reorder Now',
    time: '12 min ago',
  },
  {
    id: 2,
    type: 'anomaly',
    icon: '🔍',
    badge: 'ANOMALY',
    title: '3-pin Plug Anchor — Stock Discrepancy Detected',
    body: '18 units missing from inventory with no matching sales record. Last verified stock: 24 units. Current count: 6 units. Possible theft or miscounting.',
    action: 'Investigate',
    time: '1 hour ago',
  },
  {
    id: 3,
    type: 'hot',
    icon: '🔥',
    badge: 'HOT ITEM',
    title: '4mm Copper Wire Finolex — Velocity Spike',
    body: 'Sales velocity is 340% above normal. 142 units sold this week vs average 42 units. Revenue: ₹8,520. Consider placing a bulk order before stock depletes.',
    action: 'View Trend',
    time: '3 hours ago',
  },
  {
    id: 4,
    type: 'forecast',
    icon: '📊',
    badge: 'FORECAST',
    title: 'LED Batten 20W Philips — Stock Depletion Warning',
    body: 'At current sales rate, stock will run out in approximately 3 days. Current stock: 8 units. Daily average: 2.5 units. Suggested reorder: 15 units.',
    action: 'Stock Received',
    time: '5 hours ago',
  },
];

export const chatMessages = [
  { id: 1, role: 'user', text: "What's low today?", time: '2:14 PM' },
  {
    id: 2, role: 'ai', time: '2:14 PM',
    text: `Here's your stock status right now:\n\n🔴 Critical (need immediate reorder):\n• MCB 32A Havells — 4 units left (reorder point: 20)\n• 6mm Copper Wire Polycab — 12m left (reorder point: 30m)\n• 3-pin Plug Anchor — 6 units left (reorder point: 30)\n\n⚠️ Warning (running low):\n• 3-pin Socket Anchor — 15 units (reorder at 25)\n• LED Batten 20W Philips — 8 units (reorder at 15)\n\nI'd recommend placing a Havells order first — MCB 32A will likely run out by tomorrow at current sales velocity.`,
  },
  { id: 3, role: 'user', text: 'What about theft?', time: '2:15 PM' },
  {
    id: 4, role: 'ai', time: '2:15 PM',
    text: `I detected one anomaly today:\n\n🔍 3-pin Plug (Anchor): 18 units are missing with no matching sale. Last verified count was 24 units, but current inventory shows only 6. This could indicate theft or a counting error.\n\nRecommendation: Do a physical count of 3-pin plugs today. If the count confirms 6 units, I'll flag this for your records.`,
  },
];

export const quickReplies = [
  "What's low today?",
  "Top sellers this week?",
  "Any theft alerts?",
  "What to reorder?",
];

export const salesTrend = [
  { day: 'Mon', sales: 12400 },
  { day: 'Tue', sales: 15800 },
  { day: 'Wed', sales: 18420 },
  { day: 'Thu', sales: 14200, forecast: true },
  { day: 'Fri', sales: 16800, forecast: true },
  { day: 'Sat', sales: 21000, forecast: true },
  { day: 'Sun', sales: 9500, forecast: true },
];

export const categoryBreakdown = [
  { name: 'Wires', value: 35, color: '#00FF88' },
  { name: 'Circuit Breakers', value: 28, color: '#F5A623' },
  { name: 'Lighting', value: 18, color: '#666' },
  { name: 'Switches', value: 10, color: '#888' },
  { name: 'Others', value: 9, color: '#444' },
];

export const suppliers = [
  { id: 1, name: 'Havells Distributor', city: 'Nagpur', phone: '+91 99887 76655' },
  { id: 2, name: 'Finolex Agency', city: 'Nagpur', phone: '+91 98776 65544' },
  { id: 3, name: 'Anchor/Panasonic Dealer', city: 'Nagpur', phone: '+91 97665 54433' },
];

export const reorderThresholds = [
  { category: 'Circuit Breakers', threshold: 15, unit: 'units', aiRecommended: true },
  { category: 'Wires', threshold: 30, unit: 'm', aiRecommended: true },
  { category: 'Lighting', threshold: 15, unit: 'units', aiRecommended: false },
  { category: 'Switches', threshold: 20, unit: 'units', aiRecommended: true },
  { category: 'Accessories', threshold: 30, unit: 'units', aiRecommended: false },
  { category: 'Panels', threshold: 5, unit: 'units', aiRecommended: false },
  { category: 'Fans', threshold: 3, unit: 'units', aiRecommended: true },
];
