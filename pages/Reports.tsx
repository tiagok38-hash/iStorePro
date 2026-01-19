import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Sale, Product, Customer, User } from '../types.ts';
import { getSales, getProducts, getCustomers, getUsers, formatCurrency } from '../iStorePro/services/mockApi.ts';
import { SpinnerIcon, CalendarDaysIcon } from '../components/icons.tsx';
import { toDateValue } from '../iStorePro/utils/dateUtils.ts';

const KpiCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className }) => (
    <div className={`p-4 rounded-xl border shadow-sm ${className || 'bg-surface border-border'}`}>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
);

// Enhanced Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-xl min-w-[200px]">
                <p className="font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4 py-1">
                        <span className="text-sm font-medium flex items-center gap-2" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            {entry.name}:
                        </span>
                        <span className="text-sm font-bold text-gray-700">
                            {entry.name === 'Vendas' || entry.name === 'Quantidade'
                                ? entry.value
                                : formatCurrency(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = {
    primary: '#3b82f6',   // Blue-500
    success: '#10b981',   // Emerald-500
    purple: '#8b5cf6',    // Violet-500
    orange: '#f97316',    // Orange-500
    pink: '#ec4899',      // Pink-500
    cyan: '#06b6d4',      // Cyan-500
    slate: '#64748b'      // Slate-500
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.orange, COLORS.purple, COLORS.pink, COLORS.cyan, COLORS.slate];

const VendasReport: React.FC<{ sales: Sale[], products: Product[], customers: Customer[], users: User[] }> = ({ sales, products, customers, users }) => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return toDateValue(d);
    });
    const [endDate, setEndDate] = useState(toDateValue());
    const [sellerFilter, setSellerFilter] = useState('todos');

    const userMap = useMemo(() => users.reduce((acc, user) => ({ ...acc, [user.id]: user.name }), {} as Record<string, string>), [users]);
    const customerMap = useMemo(() => customers.reduce((acc, customer) => ({ ...acc, [customer.id]: customer.name }), {} as Record<string, string>), [customers]);
    const productMap = useMemo(() => products.reduce((acc: Record<string, Product>, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, Product>), [products]);

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);

            // Construct dates explicitly to avoid timezone issues with string parsing
            const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
            const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

            const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
            const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

            const dateMatch = saleDate >= start && saleDate <= end;
            const sellerMatch = sellerFilter === 'todos' || sale.salespersonId === sellerFilter;
            // Align with Dashboard: Consider everything except Cancelled
            const statusMatch = sale.status !== 'Cancelada';

            return dateMatch && sellerMatch && statusMatch;
        });
    }, [sales, startDate, endDate, sellerFilter]);

    const { totalSales, totalProfit, salesCount, avgTicket } = useMemo(() => {
        let totalFaturamento = 0;
        let totalRevenueForProfit = 0;
        let totalCost = 0;

        filteredSales.forEach(sale => {
            totalFaturamento += sale.total;
            totalRevenueForProfit += (sale.subtotal - sale.discount);

            const saleCost = sale.items.reduce((cost, item) => {
                const product = productMap[item.productId];
                const productCost = (product?.costPrice || 0) + (product?.additionalCostPrice || 0);
                return cost + productCost * item.quantity;
            }, 0);
            totalCost += saleCost;
        });

        const salesCount = filteredSales.length;
        const totalProfit = totalRevenueForProfit - totalCost;
        const avgTicket = salesCount > 0 ? totalFaturamento / salesCount : 0;

        return { totalSales: totalFaturamento, totalProfit, salesCount, avgTicket };
    }, [filteredSales, productMap]);

    const salesByDayData = useMemo(() => {
        const salesByDay = filteredSales.reduce<Record<string, { faturamento: number; lucro: number; vendas: number }>>((acc, sale) => {
            const day = new Date(sale.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!acc[day]) {
                acc[day] = { faturamento: 0, lucro: 0, vendas: 0 };
            }
            const saleCost = sale.items.reduce((cost, item) => {
                const product = productMap[item.productId];
                return cost + ((product?.costPrice || 0) + (product?.additionalCostPrice || 0)) * item.quantity;
            }, 0);
            const revenue = sale.subtotal - sale.discount;

            acc[day].faturamento += sale.total;
            acc[day].lucro += revenue - saleCost;
            acc[day].vendas += 1;
            return acc;
        }, {});

        return Object.entries(salesByDay).map(([name, data]) => ({ name, ...(data as any) }))
            .sort((a, b) => {
                const [dayA, monthA] = a.name.split('/');
                const [dayB, monthB] = b.name.split('/');
                return new Date(`${new Date().getFullYear()}-${monthA}-${dayA}`).getTime() - new Date(`${new Date().getFullYear()}-${monthB}-${dayB}`).getTime();
            });
    }, [filteredSales, productMap]);

    const salesByPaymentMethodData = useMemo(() => {
        const paymentData = filteredSales.flatMap(s => s.payments).reduce((acc, payment) => {
            const method = payment.method;
            if (!acc[method]) {
                acc[method] = 0;
            }
            acc[method] += payment.value;
            return acc;
        }, {} as Record<string, number>);

        // Calculate percentages for tooltip if needed, but Recharts handles pie slices prop
        return Object.entries(paymentData)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => (b.value as number) - (a.value as number)); // Sort for better visualization
    }, [filteredSales]);

    const topSellingProducts = useMemo(() => {
        const productSales = filteredSales.flatMap(s => s.items).reduce<Record<string, { name: string; revenue: number }>>((acc, item) => {
            if (!acc[item.productId]) {
                // Truncate long names for better chart display if needed, but keeping full here
                acc[item.productId] = { name: productMap[item.productId]?.model || 'Desconhecido', revenue: 0 };
            }
            acc[item.productId].revenue += item.quantity * item.unitPrice;
            return acc;
        }, {});
        return Object.values(productSales).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);
    }, [filteredSales, productMap]);

    return (
        <div className="space-y-6">
            <div className="bg-surface p-4 rounded-lg border border-border flex flex-wrap items-end gap-4 shadow-sm">
                <div>
                    <label className="text-sm font-medium text-muted mb-1 block">Data Inicial</label>
                    <div className="relative">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 pl-3 border rounded-md bg-white border-gray-200 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow w-40" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted mb-1 block">Data Final</label>
                    <div className="relative">
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 pl-3 border rounded-md bg-white border-gray-200 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow w-40" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-muted mb-1 block">Vendedor</label>
                    <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} className="p-2 border rounded-md bg-white border-gray-200 h-10 w-48 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow">
                        <option value="todos">Todos os vendedores</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Faturamento Total"
                    value={formatCurrency(totalSales)}
                    className="bg-blue-50 border-blue-100"
                />
                <KpiCard
                    title="Lucro Líquido"
                    value={formatCurrency(totalProfit)}
                    className={totalProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}
                />
                <KpiCard
                    title="Vendas Realizadas"
                    value={salesCount.toString()}
                    className="bg-purple-50 border-purple-100"
                />
                <KpiCard
                    title="Ticket Médio"
                    value={formatCurrency(avgTicket)}
                    className="bg-orange-50 border-orange-100"
                />
            </div>

            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                    Evolução Diária
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={salesByDayData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar dataKey="faturamento" fill={COLORS.primary} name="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="lucro" fill={COLORS.success} name="Lucro" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                        Formas de Pagamento
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesByPaymentMethodData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {salesByPaymentMethodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    iconType="circle"
                                    formatter={(value, entry: any) => (
                                        <span className="text-sm font-medium text-gray-600 ml-1">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                        Top 10 Produtos
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topSellingProducts}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                barSize={20}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={140}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar
                                    dataKey="revenue"
                                    fill={COLORS.purple}
                                    name="Faturamento"
                                    radius={[0, 4, 4, 0]}
                                    background={{ fill: '#f8fafc' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold text-primary mb-4">Relatório Detalhado de Vendas</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted">
                        <thead className="text-xs text-secondary uppercase bg-surface-secondary">
                            <tr>
                                <th className="px-4 py-3">ID Venda</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Vendedor</th>
                                <th className="px-4 py-3">Itens</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Lucro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => {
                                const saleCost = sale.items.reduce((cost, item) => {
                                    const product = productMap[item.productId];
                                    return cost + ((product?.costPrice || 0) + (product?.additionalCostPrice || 0)) * item.quantity;
                                }, 0);
                                const revenue = sale.subtotal - sale.discount;
                                const profit = revenue - saleCost;
                                return (
                                    <tr key={sale.id} className="bg-surface border-b border-border hover:bg-surface-secondary">
                                        <td className="px-4 py-3 font-medium text-primary">#{sale.id}</td>
                                        <td className="px-4 py-3">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-3">{customerMap[sale.customerId] || 'N/A'}</td>
                                        <td className="px-4 py-3">{userMap[sale.salespersonId] || 'N/A'}</td>
                                        <td className="px-4 py-3">{sale.items.length}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(sale.total)}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(profit)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EstoqueReport: React.FC<{ products: Product[], sales: Sale[], initialFilter: string | null }> = ({ products, sales, initialFilter }) => {
    const [stockFilter, setStockFilter] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset page when filters change
    useEffect(() => {
        if (initialFilter === 'low_stock') {
            setStockFilter('baixo');
        }
    }, [initialFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [stockFilter, searchTerm, itemsPerPage]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.model.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesStatus = true;

            switch (stockFilter) {
                case 'baixo':
                    matchesStatus = p.minimumStock != null && p.stock > 0 && p.stock <= p.minimumStock;
                    break;
                case 'zerado':
                    matchesStatus = p.stock <= 0;
                    break;
                case 'todos':
                default:
                    matchesStatus = true;
            }
            return matchesSearch && matchesStatus;
        });
    }, [products, stockFilter, searchTerm]);

    const displayedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    const kpis = useMemo(() => {
        return {
            totalItems: filteredProducts.reduce((sum, p) => sum + p.stock, 0),
            totalCost: filteredProducts.reduce((sum, p) => sum + ((p.costPrice || 0) + (p.additionalCostPrice || 0)) * p.stock, 0),
            totalSaleValue: filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
        };
    }, [filteredProducts]);

    const topSellingData = useMemo(() => {
        const productCounts: Record<string, number> = {};
        sales.forEach(sale => {
            if (sale.status === 'Cancelada') return;
            sale.items.forEach(item => {
                productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
            });
        });

        // Map counts to product names and sort
        return Object.entries(productCounts)
            .map(([id, count]) => {
                const product = products.find(p => p.id === id);
                return { name: product?.model || 'Desconhecido', value: count };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [sales, products]);

    const highMarginData = useMemo(() => {
        return products
            .map(p => {
                const cost = (p.costPrice || 0) + (p.additionalCostPrice || 0);
                const margin = p.price > 0 ? ((p.price - cost) / p.price) * 100 : 0;
                return { name: p.model, value: margin };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [products]);

    const getStatus = (product: Product) => {
        if (product.stock <= 0) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Zerado</span>;
        }
        if (product.minimumStock != null && product.stock <= product.minimumStock) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Baixo</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">OK</span>;
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface p-4 rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    {['todos', 'baixo', 'zerado'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setStockFilter(filter)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${stockFilter === filter
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Total de Itens em Estoque" value={kpis.totalItems.toLocaleString('pt-BR')} className="bg-blue-50 border-blue-100" />
                <KpiCard title="Valor de Custo do Estoque" value={formatCurrency(kpis.totalCost)} className="bg-orange-50 border-orange-100" />
                <KpiCard title="Valor de Venda do Estoque" value={formatCurrency(kpis.totalSaleValue)} className="bg-emerald-50 border-emerald-100" />
            </div>

            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-800">Inventário Detalhado</h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filteredProducts.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Exibir:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Produto</th>
                                <th className="px-4 py-3 text-center font-semibold">Estoque Atual</th>
                                <th className="px-4 py-3 text-center font-semibold">Mínimo</th>
                                <th className="px-4 py-3 text-center font-semibold">Status</th>
                                <th className="px-4 py-3 text-right font-semibold">Custo Total</th>
                                <th className="px-4 py-3 text-right font-semibold">Venda Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedProducts.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{product.model}</td>
                                    <td className="px-4 py-3 text-center font-bold text-lg text-gray-700">{product.stock}</td>
                                    <td className="px-4 py-3 text-center text-gray-500">{product.minimumStock || '-'}</td>
                                    <td className="px-4 py-3 text-center">{getStatus(product)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(((product.costPrice || 0) + (product.additionalCostPrice || 0)) * product.stock)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(product.price * product.stock)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            Nenhum produto encontrado com os filtros atuais.
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 border-t pt-4">
                        <span className="text-sm text-muted">
                            Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        Produtos Mais Vendidos (Qtd)
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topSellingData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill={COLORS.purple} name="Quantidade" radius={[0, 4, 4, 0]} background={{ fill: '#f8fafc' }}>
                                    <LabelList dataKey="value" position="right" fontSize={11} fill="#64748b" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                        Maiores Margens de Lucro (%)
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={highMarginData} layout="vertical" margin={{ top: 5, right: 45, left: 10, bottom: 5 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-xl">
                                                    <p className="font-bold text-gray-800 border-b pb-1 mb-1">{label}</p>
                                                    <p className="text-sm text-teal-600 font-semibold">Margem: {payload[0].value.toFixed(1)}%</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="value" fill={COLORS.success} name="Margem (%)" radius={[0, 4, 4, 0]} background={{ fill: '#f8fafc' }}>
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        formatter={(val: number) => `${val.toFixed(1)}%`}
                                        fontSize={11}
                                        fill="#64748b"
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};


const PlaceholderReport: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-surface p-6 rounded-lg border border-border text-center text-muted mt-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p>Este relatório está em desenvolvimento.</p>
    </div>
);


const Reports: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'vendas');
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: 'estoque', label: 'Estoque' },
        { id: 'vendas', label: 'Vendas' },
    ];

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tabs.some(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salesData, productsData, customersData, usersData] = await Promise.all([
                    getSales(),
                    getProducts(),
                    getCustomers(),
                    getUsers()
                ]);
                setSales(salesData);
                setProducts(productsData);
                setCustomers(customersData);
                setUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Relatórios</h1>
            <div className="inline-flex items-center gap-1 bg-surface-secondary p-1 rounded-lg">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }); }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-full py-10"><SpinnerIcon /></div>
            ) : (
                <>
                    {activeTab === 'vendas' && <VendasReport sales={sales} products={products} customers={customers} users={users} />}
                    {activeTab === 'estoque' && <EstoqueReport products={products} sales={sales} initialFilter={searchParams.get('filter')} />}
                </>
            )}
        </div>
    );
};

export default Reports;