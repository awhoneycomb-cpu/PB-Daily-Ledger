import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  LineChart, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  History,
  Layers,
  CalendarDays
} from 'lucide-react';
import { Transaction, isDrawerToSafeTransfer } from '../types';
import { formatPKR } from '../utils/exportSpreadsheet';

interface CashFlowTrendChartProps {
  transactions: Transaction[];
  selectedDate: string;
  onSelectDate?: (date: string) => void;
  onLoadSampleHistory?: () => void;
}

type TimeframeType = '7d' | '14d' | '30d' | 'all';
type ChartType = 'area' | 'bar' | 'net';

// Safely parse YYYY-MM-DD into a local Date at 12:00 noon (prevents any DST or UTC shifting)
const parseLocalDate = (dateStr: string): Date => {
  const parts = (dateStr || '').split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d, 12, 0, 0);
    }
  }
  const fallback = new Date();
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0);
};

const formatYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  transactions,
  selectedDate,
  onSelectDate,
  onLoadSampleHistory
}) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeframe, setTimeframe] = useState<TimeframeType>('7d');

  // 1. Group all transactions by exact date (single-pass memoized aggregation)
  const { dateMap, distinctDates, earliestTxDate, latestTxDate } = useMemo(() => {
    const map = new Map<string, { cashIn: number; cashOut: number; txCount: number; net: number }>();
    const dates = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) continue;
      dates.add(t.date);

      let entry = map.get(t.date);
      if (!entry) {
        entry = { cashIn: 0, cashOut: 0, txCount: 0, net: 0 };
        map.set(t.date, entry);
      }
      entry.txCount++;
      if (t.type === 'cash_in') {
        entry.cashIn += t.amount;
      } else if (t.type === 'cash_out') {
        // Safe vault handovers are internal cash movements, NOT expenses
        if (!isDrawerToSafeTransfer(t)) {
          entry.cashOut += t.amount;
        }
      }
      entry.net = entry.cashIn - entry.cashOut;
    }

    const sortedDates = Array.from(dates).sort();
    return {
      dateMap: map,
      distinctDates: sortedDates,
      earliestTxDate: sortedDates.length > 0 ? sortedDates[0] : null,
      latestTxDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null
    };
  }, [transactions]);

  // 2. Compute date window and generate days series
  const { chartData, totalPeriodIn, totalPeriodOut, totalPeriodNet, totalPeriodCount, activeDaysCount } = useMemo(() => {
    const refDate = parseLocalDate(selectedDate || formatYMD(new Date()));
    const daysArray: Date[] = [];

    if (timeframe === 'all' && distinctDates.length > 0) {
      const startD = parseLocalDate(distinctDates[0]);
      const endD = parseLocalDate(latestTxDate && latestTxDate > selectedDate ? latestTxDate : selectedDate);
      const diffDays = Math.min(Math.max(Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1, 7), 90);
      
      for (let i = 0; i < diffDays; i++) {
        daysArray.push(new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + i, 12, 0, 0));
      }
    } else {
      const daysCount = timeframe === '30d' ? 30 : timeframe === '14d' ? 14 : 7;
      for (let i = daysCount - 1; i >= 0; i--) {
        daysArray.push(new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - i, 12, 0, 0));
      }
    }

    let sumIn = 0;
    let sumOut = 0;
    let count = 0;
    let activeDays = 0;

    const data = daysArray.map(d => {
      const dateStr = formatYMD(d);
      const entry = dateMap.get(dateStr);
      const cashIn = entry?.cashIn || 0;
      const cashOut = entry?.cashOut || 0;
      const net = cashIn - cashOut;
      const txCount = entry?.txCount || 0;

      sumIn += cashIn;
      sumOut += cashOut;
      count += txCount;
      if (txCount > 0) activeDays++;

      const isMultiWeek = daysArray.length > 14;
      const displayLabel = isMultiWeek
        ? `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`
        : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;

      const fullLabel = d.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      return {
        date: dateStr,
        displayLabel,
        fullLabel,
        cashIn,
        cashOut,
        net,
        txCount,
        isToday: dateStr === selectedDate
      };
    });

    return {
      chartData: data,
      totalPeriodIn: sumIn,
      totalPeriodOut: sumOut,
      totalPeriodNet: sumIn - sumOut,
      totalPeriodCount: count,
      activeDaysCount: activeDays
    };
  }, [dateMap, distinctDates, earliestTxDate, latestTxDate, selectedDate, timeframe]);

  // Format large numbers for YAxis cleanly (e.g. 50k, 1M)
  const formatYAxis = (val: number) => {
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${Math.round(val / 1000)}k`;
    return String(val);
  };

  // Custom high-contrast Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-stone-900 text-white text-xs rounded-xl p-3 shadow-xl border border-stone-800 space-y-1.5 min-w-[210px]">
          <div className="font-bold text-stone-200 border-b border-stone-800 pb-1.5 flex items-center justify-between">
            <span>{item.fullLabel}</span>
            {item.isToday ? (
              <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-700/50">
                Active Date
              </span>
            ) : onSelectDate ? (
              <span className="text-[10px] text-stone-400">Click to view</span>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>Cash In (Sales):</span>
            <strong className="font-mono">{formatPKR(item.cashIn)}</strong>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <span>Cash Out (Expenses):</span>
            <strong className="font-mono">{formatPKR(item.cashOut)}</strong>
          </div>
          <div className="pt-1 border-t border-stone-800 flex items-center justify-between font-bold">
            <span className="text-stone-300">Net Cash Flow:</span>
            <span className={`font-mono ${item.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.net >= 0 ? '+' : ''}{formatPKR(item.net)}
            </span>
          </div>
          <div className="text-[10px] text-stone-400 pt-0.5 flex items-center justify-between">
            <span>{item.txCount} {item.txCount === 1 ? 'transaction' : 'transactions'}</span>
            {onSelectDate && (
              <span className="text-emerald-400 font-medium cursor-pointer underline">
                Open in Ledger
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle clicking on chart points
  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const clickedDate = e.activePayload[0].payload.date;
      if (clickedDate && onSelectDate) {
        onSelectDate(clickedDate);
      }
    }
  };

  const timeframeLabels: Record<TimeframeType, string> = {
    '7d': 'Past 7 Days',
    '14d': 'Past 14 Days',
    '30d': 'Past 30 Days',
    'all': `All History (${distinctDates.length} ${distinctDates.length === 1 ? 'day' : 'days'})`
  };

  return (
    <div 
      id="cash-flow-trend-chart" 
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6"
    >
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
              Cash Flow Historical Trends
            </h3>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {timeframeLabels[timeframe]}
            </span>
            {distinctDates.length > 0 && (
              <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-stone-500" />
                <span>{distinctDates.length} recorded {distinctDates.length === 1 ? 'day' : 'days'} in ledger</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time daily inflow vs outflow volume across calendar history. Click any day on the chart or timeline below to open its ledger.
          </p>
        </div>

        {/* Chart View & Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                timeframe === '7d'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="View last 7 days"
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('14d')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                timeframe === '14d'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="View last 14 days"
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                timeframe === '30d'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="View last 30 days"
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                timeframe === 'all'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="View all recorded dates"
            >
              All History
            </button>
          </div>

          {/* Chart Visual Type */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Flow Area Chart"
            >
              <LineChart className="w-3.5 h-3.5 text-emerald-600" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Side-by-side In vs Out Bars"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('net')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                chartType === 'net'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Net Cash Flow (+/-)"
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              <span>Net Flow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 p-3 bg-stone-50/80 rounded-xl text-xs border border-stone-100">
        <div>
          <span className="text-[11px] text-stone-500 block">Period Total Sales (In):</span>
          <strong className="text-emerald-700 font-mono text-sm">{formatPKR(totalPeriodIn)}</strong>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Period Total Expenses (Out):</span>
          <strong className="text-amber-800 font-mono text-sm">{formatPKR(totalPeriodOut)}</strong>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Period Net Cash Flow:</span>
          <strong className={`font-mono text-sm ${totalPeriodNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {totalPeriodNet >= 0 ? '+' : ''}{formatPKR(totalPeriodNet)}
          </strong>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Active Days / Period:</span>
          <strong className="text-stone-800 font-mono text-sm">
            {activeDaysCount} of {chartData.length} days
          </strong>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Total Transactions:</span>
          <strong className="text-stone-900 font-mono text-sm">{totalPeriodCount} entries</strong>
        </div>
      </div>

      {/* Single-Day Notice & Demo History Trigger */}
      {distinctDates.length <= 1 && (
        <div className="mb-4 p-3 bg-emerald-50/70 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-stone-700">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900">
                {distinctDates.length === 1 
                  ? `All transactions currently belong to ${distinctDates[0]}.` 
                  : 'No transactions recorded yet in ledger.'}
              </span>
              <p className="text-stone-600 text-[11px] mt-0.5">
                To see multi-day comparison curves across the week, select <strong>Yesterday</strong> or any past date in the <strong>Transaction Intake Form</strong> above when logging sales/expenses.
              </p>
            </div>
          </div>

          {onLoadSampleHistory && (
            <button
              type="button"
              onClick={onLoadSampleHistory}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Load 7-Day Demo History</span>
            </button>
          )}
        </div>
      )}

      {/* Main Recharts Visualization */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis 
                dataKey="displayLabel" 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={{ stroke: '#e7e5e4' }} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={32}
                formatter={(val) => (
                  <span className="text-xs font-semibold text-stone-700">
                    {val === 'cashIn' ? 'Cash In (Sales)' : 'Cash Out (Expenses)'}
                  </span>
                )}
              />
              <Area 
                type="monotone" 
                dataKey="cashIn" 
                name="cashIn"
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCashIn)" 
                cursor="pointer"
              />
              <Area 
                type="monotone" 
                dataKey="cashOut" 
                name="cashOut"
                stroke="#f59e0b" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCashOut)" 
                cursor="pointer"
              />
            </AreaChart>
          ) : chartType === 'bar' ? (
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis 
                dataKey="displayLabel" 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={{ stroke: '#e7e5e4' }} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={32}
                formatter={(val) => (
                  <span className="text-xs font-semibold text-stone-700">
                    {val === 'cashIn' ? 'Cash In (Sales)' : 'Cash Out (Expenses)'}
                  </span>
                )}
              />
              <Bar dataKey="cashIn" name="cashIn" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} cursor="pointer" />
              <Bar dataKey="cashOut" name="cashOut" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} cursor="pointer" />
            </BarChart>
          ) : (
            <AreaChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis 
                dataKey="displayLabel" 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={{ stroke: '#e7e5e4' }} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                tick={{ fontSize: 11, fill: '#78716c' }} 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={32}
                formatter={() => (
                  <span className="text-xs font-semibold text-stone-700">
                    Net Cash Flow (In - Out)
                  </span>
                )}
              />
              <Area 
                type="monotone" 
                dataKey="net" 
                stroke="#0284c7" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorNet)" 
                cursor="pointer"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Recorded History Dates Navigation Ribbon */}
      {distinctDates.length > 0 && onSelectDate && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Jump to Recorded Date in Ledger:</span>
            </span>
            <span className="text-[11px] text-stone-400">
              Active Date: <strong className="text-stone-800">{selectedDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {distinctDates.map(dateStr => {
              const entry = dateMap.get(dateStr);
              const isActive = dateStr === selectedDate;
              const d = parseLocalDate(dateStr);
              const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                  title={`Open ledger for ${dateStr}`}
                >
                  <span className={isActive ? 'text-emerald-200' : 'text-stone-400'}>
                    {dayLabel}
                  </span>
                  <span className="font-mono font-bold">
                    {formatPKR(entry?.cashIn || 0)}
                  </span>
                  {isActive && <CheckCircle2 className="w-3 h-3 text-emerald-200" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
