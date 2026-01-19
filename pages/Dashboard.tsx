
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { getProducts, getCustomers, getSales, getTodaysSales, formatCurrency, getPaymentMethods } from '../iStorePro/services/mockApi.ts';
import { Product, Customer, Sale, TodaySale, PaymentMethodParameter } from '../types.ts';
import { SpinnerIcon, SmartphoneIcon, TagIcon, UserIcon, CubeIcon, ChartBarIcon } from '../components/icons.tsx';

// --- Components ---
const InfoBanner: React.FC = React.memo(() => (
    <div className="bg-accent-light text-accent text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-2">
        <SmartphoneIcon className="h-4 w-4" />
        <span>Bem-vindo ao iStore! Fique de olho para novidades.</span>
    </div>
));

const LowStockBanner: React.FC<{ count: number }> = React.memo(({ count }) => (
    <Link to="/reports?tab=estoque&filter=low_stock" className="bg-danger-light text-danger text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-200 transition-colors">
        <TagIcon className="h-4 w-4" />
        <span className="font-semibold">Produtos com estoque baixo: {count}</span>
    </Link>
));


const StatCard: React.FC<{ title: string; value: string; subValue1?: string; subValue2?: string; subValue3?: string; className?: string }> = React.memo(({ title, value, subValue1, subValue2, subValue3, className }) => (
    <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 ${className || 'bg-surface'}`}>
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-secondary uppercase tracking-wider">{title}</h3>
            <button className="text-xs font-semibold text-muted bg-surface-secondary px-3 py-1 rounded-full hover:bg-border">ATUALIZAR</button>
        </div>
        <p className="text-3xl font-bold text-primary mt-2">{value}</p>
        {subValue1 && <p className="text-sm text-blue-600 font-semibold mt-1">{subValue1}</p>}
        {subValue2 && <p className="text-base text-success font-semibold">{subValue2}</p>}
        {subValue3 && <p className="text-base text-success font-semibold">{subValue3}</p>}
    </div>
));

const ProfitCard: React.FC<{ sales: Sale[]; products: Product[]; className?: string }> = React.memo(({ sales, products, className }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    const { totalProfit, chartData } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        switch (period) {
            case 'day': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
        }

        const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);
        const validSales = sales.filter(s => {
            if (s.status === 'Cancelada') return false;
            const d = new Date(s.date);
            return d >= startDate && d <= endDate;
        });

        let totalProfit = 0;
        const profitByPoint: Record<string, number> = {};

        // Generate Labels
        let labels: string[] = [];
        if (period === 'day') labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
        else if (period === 'year') labels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        else {
            const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const startD = new Date(startDate);
            labels = Array.from({ length: days + 1 }, (_, i) => {
                const d = new Date(startD);
                d.setDate(d.getDate() + i);
                return `${d.getDate()}`;
            });
        }
        labels.forEach(l => profitByPoint[l] = 0);

        const getKey = (date: Date) => {
            if (period === 'day') return `${date.getHours()}h`;
            if (period === 'year') return ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][date.getMonth()];
            return `${date.getDate()}`;
        };

        validSales.forEach(sale => {
            const itemsCost = sale.items.reduce((sum, item) => {
                const p = productMap[item.productId];
                return sum + ((p?.costPrice || 0) + (p?.additionalCostPrice || 0)) * item.quantity;
            }, 0);
            const profit = (sale.subtotal - sale.discount) - itemsCost;
            totalProfit += profit;

            const key = getKey(new Date(sale.date));
            if (profitByPoint[key] !== undefined) profitByPoint[key] += profit;
        });

        const chartData = labels.map(l => ({ name: l, value: profitByPoint[l] }));
        return { totalProfit, chartData };
    }, [sales, products, period]);

    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 flex flex-col justify-between ${className || 'bg-surface'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Lucro Estimado</h3>
                    <p className="text-3xl font-bold text-success mt-1">{formatCurrency(totalProfit)}</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="text-xs font-semibold text-muted bg-surface-secondary px-2 py-1 rounded-md border-0 focus:ring-1 focus:ring-accent cursor-pointer"
                >
                    <option value="day">Hoje</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                </select>
            </div>

            <div className="flex-1 mt-4" style={{ minHeight: '100px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            cursor={false}
                            contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)' }}
                            formatter={(val: number) => [formatCurrency(val), 'Lucro']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const SalesByDayCard: React.FC<{ sales: Sale[]; customers: Customer[]; className?: string }> = React.memo(({ sales, customers, className }) => {
    const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<string, string>), [customers]);

    const todaysSalesList = useMemo(() => {
        const todayStr = new Date().toDateString();
        return sales.filter(s => new Date(s.date).toDateString() === todayStr && s.status !== 'Cancelada');
    }, [sales]);

    const todaysSummary = useMemo(() => {
        const total = todaysSalesList.reduce((sum, s) => sum + s.total, 0);
        const count = todaysSalesList.length;
        return { total, count };
    }, [todaysSalesList]);

    const getPaymentBadges = (sale: Sale) => {
        const methods = [...new Set(sale.payments.map(p => p.method))];
        return methods.slice(0, 2).map(m => {
            const colors: Record<string, string> = {
                'Pix': 'bg-green-100 text-green-700',
                'Dinheiro': 'bg-yellow-100 text-yellow-700',
                'Débito': 'bg-blue-100 text-blue-700',
                'Crédito': 'bg-purple-100 text-purple-700',
                'Aparelho na Troca': 'bg-orange-100 text-orange-700',
                'Crediário': 'bg-red-100 text-red-700',
            };
            return { method: m, color: colors[m] || 'bg-gray-100 text-gray-700' };
        });
    };

    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 h-full flex flex-col ${className || 'bg-surface'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Vendas de Hoje</h3>
                {todaysSummary.count > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs bg-accent-light text-accent px-2 py-1 rounded-full font-bold">
                            {todaysSummary.count} {todaysSummary.count === 1 ? 'venda' : 'vendas'}
                        </span>
                        <span className="text-sm font-bold text-success">
                            {formatCurrency(todaysSummary.total)}
                        </span>
                    </div>
                )}
            </div>
            {todaysSalesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                    <svg className="w-12 h-12 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <p className="mt-2 font-semibold">Nenhuma venda ainda...</p>
                    <p className="text-sm text-muted">Aqui você verá suas vendas de hoje.</p>
                </div>
            ) : (
                <div className="overflow-y-auto flex-1 space-y-2 custom-scrollbar max-h-72">
                    {todaysSalesList.map(sale => (
                        <div key={sale.id} className="p-3 bg-surface-secondary rounded-xl border border-border hover:border-accent transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-accent text-sm">#{sale.id}</span>
                                    <span className="text-xs text-muted bg-white px-2 py-0.5 rounded">
                                        {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span className="font-bold text-primary text-lg">{formatCurrency(sale.total)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col gap-1.5">
                                    <p className="text-xs text-primary font-medium truncate max-w-[150px] flex items-center gap-1.5" title={customerMap[sale.customerId]}>
                                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                                        {customerMap[sale.customerId] || 'Cliente'}
                                    </p>
                                    <p className="text-xs text-muted flex items-center gap-1.5">
                                        <CubeIcon className="h-3.5 w-3.5 text-gray-400" />
                                        {sale.items.reduce((sum, i) => sum + i.quantity, 0)} {sale.items.length === 1 ? 'item' : 'itens'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1 justify-end">
                                    {getPaymentBadges(sale).map((badge, idx) => (
                                        <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                                            {badge.method}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const BillingChart: React.FC<{
    data: { name: string; faturamento: number }[];
    period: 'day' | 'week' | 'month' | 'year' | 'all_years';
    onPeriodChange: (period: 'day' | 'week' | 'month' | 'year' | 'all_years') => void;
    className?: string;
}> = React.memo(({ data, period, onPeriodChange, className }) => {
    const maxFaturamento = useMemo(() => Math.max(...data.map(d => d.faturamento), 1), [data]);

    const getColor = (value: number) => {
        if (value <= 0) return '#ffffff00'; // Fully transparent
        const intensity = value / maxFaturamento;
        const lightness = 80 - (intensity * 35);
        return `hsl(217, 91%, ${lightness}%)`;
    };

    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 h-full ${className || 'bg-surface'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Faturamento</h3>
                <select
                    value={period}
                    onChange={(e) => onPeriodChange(e.target.value as any)}
                    className="text-xs font-semibold text-muted bg-surface-secondary px-3 py-1 rounded-full border-0 focus:ring-2 focus:ring-accent cursor-pointer"
                >
                    <option value="day">Hoje</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano atual</option>
                    <option value="all_years">Anos</option>
                </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} width={90} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                        cursor={{ fill: '#9ca3af', opacity: 0.1, radius: 4 }}
                        contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem' }}
                        formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="faturamento" name="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={30}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.faturamento)} strokeWidth={0} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

const PaymentMethodTotalsCard: React.FC<{ sales: Sale[]; activeMethods: PaymentMethodParameter[]; className?: string }> = React.memo(({ sales, activeMethods, className }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    // Helper for colors
    const getColorForMethod = (method: string) => {
        const lower = method.toLowerCase();
        if (lower.includes('pix')) return { color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700' };
        if (lower.includes('dinheiro') || lower.includes('espécie')) return { color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' };
        if (lower.includes('débito')) return { color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' };
        if (lower.includes('crédito')) return { color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' };
        if (lower.includes('troca')) return { color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700' };
        if (lower.includes('crediário')) return { color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700' };

        // Hash for consistent random colors
        const colors = [
            { color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700' },
            { color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700' },
            { color: 'bg-teal-500', lightColor: 'bg-teal-100 text-teal-700' },
            { color: 'bg-cyan-500', lightColor: 'bg-cyan-100 text-cyan-700' },
            { color: 'bg-rose-500', lightColor: 'bg-rose-100 text-rose-700' },
            { color: 'bg-amber-500', lightColor: 'bg-amber-100 text-amber-700' },
        ];
        const hash = method.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        return colors[Math.abs(hash) % colors.length];
    };

    const allMethodNames = useMemo(() => {
        // Confirmed active methods from settings
        const configured = activeMethods.map(m => m.name);
        // Methods actually used in sales (history)
        // Also explicitly include 'Aparelho na Troca' if not present, as it's a system feature
        const systemMethods = ['Aparelho na Troca'];

        const all = new Set([...configured, ...systemMethods]);
        return Array.from(all);
    }, [activeMethods]);

    const paymentTotals = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
        }

        const filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return sale.status !== 'Cancelada' && saleDate >= startDate && saleDate <= endDate;
        });

        // Initialize with all known methods
        const totals: Record<string, number> = {};
        allMethodNames.forEach(name => totals[name] = 0);

        filteredSales.forEach(sale => {
            sale.payments.forEach(payment => {
                // Normalize legacy names to avoid duplicates
                let methodKey = payment.method;
                const normalizeMap: Record<string, string> = {
                    'Crédito': 'Cartão Crédito',
                    'Cartão de crédito': 'Cartão Crédito',
                    'Débito': 'Cartão de débito'
                };

                if (normalizeMap[methodKey] && allMethodNames.includes(normalizeMap[methodKey])) {
                    methodKey = normalizeMap[methodKey];
                }
                // If key exists in our predefined 'totals', use it. Else initialize it (for historical methods that were deleted but exist in sales)
                if (totals[methodKey] === undefined) {
                    totals[methodKey] = 0;
                }
                totals[methodKey] += payment.value;
            });
        });

        return totals;
    }, [sales, period, allMethodNames]);

    const grandTotal = useMemo(() =>
        Object.values(paymentTotals).reduce((sum: number, val: number) => sum + val, 0)
        , [paymentTotals]);

    // Generate list for rendering, sorted by value desc or stable order
    const renderedList = useMemo(() => {
        const keys = Object.keys(paymentTotals);
        // Sort: Non-zero values first (desc), then alphabetical
        return keys.sort((a, b) => {
            const valA = paymentTotals[a];
            const valB = paymentTotals[b];
            if (valA !== valB) return valB - valA;
            return a.localeCompare(b);
        }).map(key => ({
            key,
            label: key,
            value: paymentTotals[key],
            ...getColorForMethod(key)
        }));
    }, [paymentTotals]);


    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 ${className || 'bg-surface'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Total por Forma de Pagamento</h3>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="text-xs font-semibold text-muted bg-surface-secondary px-3 py-1 rounded-full border-0 focus:ring-2 focus:ring-accent cursor-pointer"
                >
                    <option value="day">Hoje</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                </select>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {renderedList.map(({ key, label, color, lightColor, value }) => {
                    const percentage = grandTotal > 0 ? (value / grandTotal) * 100 : 0;

                    return (
                        <div key={key} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${color} shrink-0`}></div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-secondary">{label}</span>
                                    <span className="text-sm font-bold text-primary">{formatCurrency(value)}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm font-bold text-muted uppercase">Total Geral</span>
                <span className="text-lg font-bold text-success">{formatCurrency(grandTotal)}</span>
            </div>
        </div>
    );
});

interface SoldItemInfo {
    productName: string;
    quantity: number;
    saleDate: string;
    saleId: string;
    productId: string;
}

const RecentSoldProductsCard: React.FC<{ soldItems: SoldItemInfo[]; className?: string }> = React.memo(({ soldItems, className }) => {
    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 ${className || 'bg-surface'}`}>
            <h3 className="text-sm font-black text-secondary mb-3 uppercase tracking-wider">Últimos Produtos Vendidos</h3>
            {soldItems.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">Nenhum produto vendido recentemente.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-muted">
                                <th className="font-medium pb-2">Produto</th>
                                <th className="font-medium pb-2">Data</th>
                                <th className="font-medium pb-2 text-center">Qtd</th>
                            </tr>
                        </thead>
                        <tbody>
                            {soldItems.map((item, index) => (
                                <tr key={`${item.saleId}-${item.productId}-${index}`} className="border-t border-border text-secondary">
                                    <td className="py-2 font-semibold">{item.productName}</td>
                                    <td className="py-2">{new Date(item.saleDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="py-2 text-center">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

const RecentAddedProductsCard: React.FC<{ products: Product[]; className?: string }> = React.memo(({ products, className }) => {
    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 ${className || 'bg-surface'}`}>
            <h3 className="text-sm font-black text-secondary mb-3 uppercase tracking-wider">Últimos Produtos Adicionados</h3>
            {products.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">Nenhum produto adicionado recentemente.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="w-full">
                            <tr className="text-left text-muted">
                                <th className="font-medium pb-2">Produto</th>
                                <th className="font-medium pb-2">Data</th>
                                <th className="font-medium pb-2 text-right">Custo</th>
                                <th className="font-medium pb-2 text-right">Venda</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className="border-t border-border text-secondary">
                                    <td className="py-2">
                                        <div className="flex flex-col">
                                            <span className="font-semibold truncate max-w-[160px]" title={product.model}>{product.model}</span>
                                            {product.origin === 'Troca' && (
                                                <span className="text-[6px] px-1 py-px rounded bg-orange-100 text-orange-700 font-bold uppercase w-fit mt-0.5">
                                                    Troca
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-2 text-xs">{new Date(product.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td className="py-2 text-right text-xs text-muted">{formatCurrency(product.costPrice)}</td>
                                    <td className="py-2 text-right font-semibold">{formatCurrency(product.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

const StockStatsCard: React.FC<{ products: Product[]; className?: string }> = React.memo(({ products, className }) => {
    const stats = useMemo(() => {
        // Status field does not strictly exist on Product type, use stock > 0
        const appleProducts = products.filter(p => p.stock > 0 && p.brand?.toLowerCase().includes('apple'));
        const otherProducts = products.filter(p => p.stock > 0 && !p.brand?.toLowerCase().includes('apple'));

        const calculateMetrics = (items: Product[]) => {
            const count = items.reduce((acc, p) => acc + (p.stock || 1), 0);
            const cost = items.reduce((acc, p) => acc + ((p.costPrice || 0) + (p.additionalCostPrice || 0)) * (p.stock || 1), 0);
            const value = items.reduce((acc, p) => acc + p.price * (p.stock || 1), 0);
            const markup = cost > 0 ? ((value - cost) / cost) * 100 : 0;
            return { count, cost, value, markup };
        };

        const apple = calculateMetrics(appleProducts);
        const others = calculateMetrics(otherProducts);
        const total = {
            count: apple.count + others.count,
            cost: apple.cost + others.cost,
            value: apple.value + others.value,
        };
        const totalMarkup = total.cost > 0 ? ((total.value - total.cost) / total.cost) * 100 : 0;

        return { apple, others, total: { ...total, markup: totalMarkup } };
    }, [products]);

    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 bg-surface ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Estoque Disponível</h3>
                <span className="text-[10px] font-bold text-muted bg-surface-secondary px-2 py-0.5 rounded-full uppercase tracking-wide border border-border">Em Tempo Real</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Apple Column */}
                <div className="flex flex-col space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/60 shadow-sm relative overflow-hidden group h-full">
                    {/* Decorative bg icon */}
                    <svg className="absolute -right-4 -bottom-4 w-16 h-16 text-gray-200/50 transform rotate-12 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.29-1.23 3.57-1.23.96 0 1.94.48 2.5 1.23-2.22 1.37-1.94 4.54.44 5.79-.64 1.88-1.59 3.53-2.59 4.44zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.53 4.58-3.74 4.25z" /></svg>

                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <div className="w-5 h-5 flex items-center justify-center bg-black rounded-full shadow-sm text-white">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.29-1.23 3.57-1.23.96 0 1.94.48 2.5 1.23-2.22 1.37-1.94 4.54.44 5.79-.64 1.88-1.59 3.53-2.59 4.44zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.53 4.58-3.74 4.25z" /></svg>
                        </div>
                        <p className="font-bold text-sm text-gray-800">Apple</p>
                    </div>

                    <div className="relative z-10 flex flex-col flex-1 justify-between">
                        <div>
                            <p className="text-2xl font-bold text-primary tracking-tight">{stats.apple.count}</p>
                            <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-2">Itens em estoque</p>
                        </div>

                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-gray-600"><span>Custo:</span> <span className="font-semibold text-gray-800">{formatCurrency(stats.apple.cost)}</span></div>
                            <div className="flex justify-between items-center text-gray-600"><span>Venda:</span> <span className="font-semibold text-blue-600">{formatCurrency(stats.apple.value)}</span></div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60 mt-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Markup</span>
                                <span className="bg-white text-green-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 text-[10px] font-bold">{stats.apple.markup.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Others Column */}
                <div className="flex flex-col space-y-3 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden h-full">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full border border-gray-200 text-gray-400">
                            <CubeIcon className="w-3 h-3" />
                        </div>
                        <p className="font-bold text-sm text-gray-800">Outros</p>
                    </div>
                    <div className="flex flex-col flex-1 justify-between">
                        <div>
                            <p className="text-2xl font-bold text-primary tracking-tight">{stats.others.count}</p>
                            <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-2">Itens em estoque</p>
                        </div>
                        <div className="space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between items-center"><span>Custo:</span> <span className="font-semibold text-gray-800">{formatCurrency(stats.others.cost)}</span></div>
                            <div className="flex justify-between items-center"><span>Venda:</span> <span className="font-semibold text-blue-600">{formatCurrency(stats.others.value)}</span></div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 mt-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Markup</span>
                                <span className="bg-gray-50 text-green-700 px-1.5 py-0.5 rounded border border-gray-100 text-[10px] font-bold">{stats.others.markup.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Footer */}
            <div className="mt-5 pt-4 border-t border-border">
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                            <ChartBarIcon className="w-3 h-3" /> Total Geral Estimado
                        </p>
                        <div className="flex gap-3 text-xs text-gray-500">
                            <span>Custo: <strong className="text-gray-700">{formatCurrency(stats.total.cost)}</strong></span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary leading-none">{formatCurrency(stats.total.value)}</div>
                        <div className="flex justify-end mt-1">
                            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                +{stats.total.markup.toFixed(2)}% Markup Médio
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const CustomersStatsCard: React.FC<{ customers: Customer[]; sales: Sale[]; className?: string }> = React.memo(({ customers, sales, className }) => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all_years'>('month');

    // Calculate chart data and metrics
    const { chartData, newCustomersCount, totalDebt } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        // 1. Determine date range
        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                startDate.setDate(now.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'all_years':
                startDate = new Date(2000, 0, 1);
                endDate = new Date();
                break;
        }

        // 2. Filter new customers in period
        const newCustomers = customers.filter(c => {
            const dateStr = c.createdAt || c.created_at;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return date >= startDate && date <= endDate;
        });

        const newCustomersCount = newCustomers.length;

        // 3. Prepare Chart Data
        let chartData: { name: string; count: number }[] = [];

        if (period === 'year' || period === 'all_years') {
            const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
            const counts = new Array(12).fill(0);
            newCustomers.forEach(c => {
                const dateStr = c.createdAt || c.created_at;
                if (dateStr) {
                    const m = new Date(dateStr).getMonth();
                    counts[m]++;
                }
            });
            chartData = months.map((m, i) => ({ name: m, count: counts[i] }));
        } else {
            const map = new Map<number, number>();
            newCustomers.forEach(c => {
                const dateStr = c.createdAt || c.created_at;
                if (dateStr) {
                    const d = new Date(dateStr).getDate();
                    map.set(d, (map.get(d) || 0) + 1);
                }
            });

            if (period === 'day') {
                const byHour = new Array(24).fill(0);
                newCustomers.forEach(c => {
                    const dateStr = c.createdAt || c.created_at;
                    if (dateStr) byHour[new Date(dateStr).getHours()]++;
                });
                chartData = byHour.map((c, i) => ({ name: `${i}h`, count: c }));
            } else {
                const daysInMonth = endDate.getDate(); // Last day
                chartData = Array.from({ length: daysInMonth }, (_, i) => ({
                    name: `${i + 1}`,
                    count: map.get(i + 1) || 0
                }));
            }
        }

        const totalDebt = sales.reduce((acc, sale) => {
            if (sale.status === 'Cancelada') return acc;
            const pending = sale.payments.filter(p => p.type === 'pending').reduce((s, p) => s + p.value, 0);
            return acc + pending;
        }, 0);

        return { chartData, newCustomersCount, totalDebt };
    }, [customers, sales, period]);


    return (
        <div className={`p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-300/80 flex flex-col justify-between ${className || 'bg-surface'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Clientes</h3>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">
                                {newCustomersCount > 0 ? '+' : ''}{newCustomersCount} novos
                            </span>
                            <span className="text-[10px] text-muted">no período</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-primary mt-1">{customers.length}</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="text-xs font-semibold text-muted bg-surface-secondary px-2 py-1 rounded-md border-0 focus:ring-1 focus:ring-accent cursor-pointer"
                >
                    <option value="day">Hoje</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                </select>
            </div>

            <div className="flex-1 flex flex-col justify-end">

                <div className="h-16 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="count" stroke="#4ade80" fillOpacity={1} fill="url(#colorCustomers)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border cursor-pointer group" onClick={() => navigate('/customers?filter=debtors')}>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50/50 p-3 border border-red-100/50 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:bg-rose-50 group-active:scale-[0.99]">
                    <div className="relative flex justify-between items-center z-10">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-rose-600/80">
                            Valores a receber (Total)
                        </span>
                        <span className="text-base font-bold text-rose-700 tracking-tight">
                            {formatCurrency(totalDebt)}
                        </span>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -right-2 -top-2 w-12 h-12 bg-red-100/50 rounded-full blur-lg" />
                </div>
            </div>
        </div>
    );
});

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodParameter[]>([]);
    //const [todaysSales, setTodaysSales] = useState<TodaySale[]>([]); // Removing unused state
    const [billingPeriod, setBillingPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all_years'>('year');

    const fetchData = useCallback(async (retryCount = 0) => {
        setLoading(true);
        setError(null);

        // Helper: Fetches data, logs errors, but returns fallback instead of throwing
        const fetchResilient = async <T,>(name: string, fetcher: () => Promise<T>, fallback: T): Promise<T> => {
            try {
                return await fetcher();
            } catch (error: any) {
                console.warn(`Dashboard: Falha ao carregar ${name}. Usando fallback.`, error);

                // If it's a critical AbortError, we might want to know, but for Dashboard display, partial data is better than error screen.
                if (retryCount < 2 && (error?.message?.includes('aborted') || error?.name === 'AbortError')) {
                    console.log(`Dashboard: ${name} aborted, useful to retry individual logic if needed.`);
                }
                return fallback;
            }
        };

        try {
            // STEP 1: Configs (Fastest) - Can fallback
            const methodsData = await fetchResilient('PaymentMethods', getPaymentMethods, []);
            setPaymentMethods(methodsData);

            // STEP 2: Products (Medium) - Critical
            // Fail loud if products fail, so user knows connection is bad
            let productsData;
            try {
                productsData = await getProducts();
            } catch (e) {
                console.error("Dashboard: Failed critical fetch: Products", e);
                throw e;
            }
            setProducts(productsData);

            // STEP 3: Sales (Heavy) - Critical
            // Fail loud if sales fail
            let salesData;
            try {
                salesData = await getSales();
            } catch (e) {
                console.error("Dashboard: Failed critical fetch: Sales", e);
                throw e;
            }
            setSales(salesData);

            // STEP 4: Customers (Heavy) - Can fallback (less critical for KPI numbers usually, but good to have)
            const customersData = await fetchResilient('Customers', getCustomers, []);
            setCustomers(customersData);

        } catch (err: any) {
            console.error('Dashboard fetchData critical error:', err);
            setError("Falha ao carregar os dados. Sua conexão parece instável.");
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchData();

        const handleRefetch = () => {
            console.log('Dashboard: Refetching data due to app focus/online event');
            fetchData();
        };

        window.addEventListener('app-focus-refetch', handleRefetch);

        const channel = new BroadcastChannel('app_cache_sync');
        channel.onmessage = (event) => {
            if (event.data && event.data.type === 'CLEAR_CACHE') {
                const keys = event.data.keys;
                if (keys.includes('sales')) {
                    fetchData();
                }
            }
        };

        return () => {
            channel.close();
            window.removeEventListener('app-focus-refetch', handleRefetch);
        };
    }, [fetchData]);

    const dashboardMetrics = React.useMemo(() => {
        const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
        const stockCost = products.reduce((acc, p) => acc + ((p.costPrice || 0) + (p.additionalCostPrice || 0)) * p.stock, 0);
        const stockValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);
        const markup = stockCost > 0 ? ((stockValue - stockCost) / stockCost) * 100 : 0;
        const customerCount = customers.length;

        const now = new Date();
        let billingChartData: { name: string; faturamento: number }[] = [];
        const relevantSales = sales.filter(s => s.status !== 'Cancelada');

        if (billingPeriod === 'year') {
            const salesByMonth = relevantSales
                .filter(sale => new Date(sale.date).getFullYear() === now.getFullYear())
                .reduce((acc, sale) => {
                    const monthIndex = new Date(sale.date).getMonth();
                    acc[monthIndex] = (acc[monthIndex] || 0) + sale.total;
                    return acc;
                }, {} as Record<string, number>);

            const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
            billingChartData = monthNames.map((name, index) => ({ name, faturamento: salesByMonth[index] || 0 }));
        } else if (billingPeriod === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const daysInMonth = endOfMonth.getDate();
            const salesThisMonth = relevantSales.filter(s => { const d = new Date(s.date); return d >= startOfMonth && d <= endOfMonth; });
            const salesByDay = salesThisMonth.reduce((acc, sale) => {
                const day = new Date(sale.date).getDate();
                acc[day] = (acc[day] || 0) + sale.total;
                return acc;
            }, {} as Record<number, number>);
            billingChartData = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                return { name: day.toString().padStart(2, '0'), faturamento: salesByDay[day] || 0 };
            });
        } else if (billingPeriod === 'week') {
            const dayOfWeek = now.getDay();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            const salesThisWeek = relevantSales.filter(s => { const d = new Date(s.date); return d >= startOfWeek && d <= endOfWeek; });
            const salesByDayOfWeek = salesThisWeek.reduce((acc, sale) => {
                const day = new Date(sale.date).getDay();
                acc[day] = (acc[day] || 0) + sale.total;
                return acc;
            }, {} as Record<number, number>);
            const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            billingChartData = weekDays.map((name, index) => ({ name, faturamento: salesByDayOfWeek[index] || 0 }));
        } else if (billingPeriod === 'day') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const salesToday = relevantSales.filter(s => new Date(s.date) >= startOfDay);
            const salesByHour = salesToday.reduce((acc, sale) => {
                const hour = new Date(sale.date).getHours();
                acc[hour] = (acc[hour] || 0) + sale.total;
                return acc;
            }, {} as Record<number, number>);
            billingChartData = Array.from({ length: 24 }, (_, i) => ({
                name: `${i.toString().padStart(2, '0')}h`,
                faturamento: salesByHour[i] || 0
            }));
        } else if (billingPeriod === 'all_years') {
            const salesByYear = relevantSales.reduce((acc, sale) => {
                const year = new Date(sale.date).getFullYear();
                acc[year] = (acc[year] || 0) + sale.total;
                return acc;
            }, {} as Record<number, number>);

            // Get unique years from sales, or at least current year
            const years = Array.from(new Set(relevantSales.map(s => new Date(s.date).getFullYear()))).sort((a: number, b: number) => a - b);
            if (years.length === 0) years.push(now.getFullYear());

            billingChartData = years.map(year => ({
                name: year.toString(),
                faturamento: salesByYear[year] || 0
            }));
        }

        return { totalStock, stockCost, stockValue, markup, customerCount, billingChartData };
    }, [products, customers, sales, billingPeriod]);

    const { recentSales, recentSoldItems, recentAddedProducts } = React.useMemo(() => {
        const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const recentSales = sortedSales.slice(0, 5);

        const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p.model }), {} as Record<string, string>);

        const recentSoldItems: SoldItemInfo[] = sortedSales
            .flatMap(sale => sale.items.map(item => ({
                productName: productMap[item.productId] || 'Desconhecido',
                quantity: item.quantity,
                saleDate: sale.date,
                saleId: sale.id,
                productId: item.productId,
            })))
            .slice(0, 5);

        const sortedProducts = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recentAddedProducts = sortedProducts.slice(0, 5);

        return { recentSales, recentSoldItems, recentAddedProducts };
    }, [sales, products]);

    const lowStockCount = useMemo(() =>
        products.filter(p => p.stock > 0 && p.minimumStock && p.stock <= p.minimumStock).length
        , [products]);

    if (loading) return <div className="flex justify-center items-center h-full"><SpinnerIcon /></div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-10">
            <p className="text-center text-danger">{error}</p>
            <button
                onClick={() => fetchData()}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
                Tentar Novamente
            </button>
        </div>
    );


    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
                    <p className="text-muted">Meu Plano: <span className="font-semibold text-secondary">Plus (Trimestral)</span></p>
                </div>
                <div className="flex items-center gap-4">
                    {lowStockCount > 0 && <LowStockBanner count={lowStockCount} />}
                    <InfoBanner />
                </div>
            </div>

            {/* Diagnostic for Inconsistent Sales */}
            {(() => {
                const inconsistentSales = sales.filter(s => s.status !== 'Cancelada' && s.status !== 'Orçamento').filter(s => {
                    const totalPaid = s.payments.reduce((acc, p) => acc + p.value, 0);
                    return Math.abs(s.total - totalPaid) > 0.1;
                });

                if (inconsistentSales.length === 0) return null;

                return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in">
                        <h3 className="text-yellow-800 font-bold flex items-center gap-2 mb-2">
                            <span className="text-xl">⚠️</span> Discrepância Financeira Detectada
                        </h3>
                        <p className="text-yellow-700 text-sm mb-3">
                            Encontramos {inconsistentSales.length} venda(s) onde o valor total diverge da soma dos pagamentos. Isso causa a diferença entre o Faturamento e o Total recebido.
                        </p>
                        <div className="bg-white rounded border border-yellow-100 overflow-hidden max-h-40 overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-yellow-100/50 text-yellow-800">
                                    <tr>
                                        <th className="p-2">ID Venda</th>
                                        <th className="p-2">Data</th>
                                        <th className="p-2 text-right">Total Venda</th>
                                        <th className="p-2 text-right">Total Pagamentos</th>
                                        <th className="p-2 text-right">Diferença</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inconsistentSales.map(s => {
                                        const paid = s.payments.reduce((acc, p) => acc + p.value, 0);
                                        const diff = paid - s.total;
                                        return (
                                            <tr key={s.id} className="border-t border-yellow-50 hover:bg-yellow-50/50 text-gray-700">
                                                <td className="p-2 font-bold">#{s.id}</td>
                                                <td className="p-2">{new Date(s.date).toLocaleDateString()}</td>
                                                <td className="p-2 text-right">{formatCurrency(s.total)}</td>
                                                <td className="p-2 text-right">{formatCurrency(paid)}</td>
                                                <td className="p-2 text-right font-bold text-red-600">
                                                    {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
                <StockStatsCard products={products} />
                <CustomersStatsCard
                    customers={customers}
                    sales={sales}
                />
                <ProfitCard sales={sales} products={products} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SalesByDayCard sales={sales} customers={customers} />
                </div>
                <div className="lg:col-span-2 min-h-[400px]">
                    <BillingChart data={dashboardMetrics.billingChartData} period={billingPeriod} onPeriodChange={setBillingPeriod} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <RecentAddedProductsCard products={recentAddedProducts} />
                <div className="h-full">
                    <PaymentMethodTotalsCard sales={sales} activeMethods={paymentMethods} />
                </div>
                <RecentSoldProductsCard soldItems={recentSoldItems} />
            </div>
        </div>
    );
};

export default Dashboard;
