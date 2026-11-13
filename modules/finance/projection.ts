export type MonthOutlookInput = {
  salesSoFar: number;
  profitSoFar: number;
  bills: number;
  elapsedDays: number;
  daysInMonth: number;
};

export type MonthOutlook = MonthOutlookInput & {
  projectedSales: number;
  projectedProfit: number;
  left: number;
  gap: number;
  onTrack: boolean;
  extraSales: number | null;
  perDay: number | null;
  remainingDays: number;
};

export function monthWindow(today: string) {
  const [year, month] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${today.slice(0, 7)}-01`;
  const to = `${today.slice(0, 7)}-${String(daysInMonth).padStart(2, "0")}`;
  return {
    from,
    to,
    daysInMonth,
    elapsedDays: Number(today.slice(8, 10)),
  };
}

export function projectMonth(input: MonthOutlookInput, goal: number): MonthOutlook {
  const elapsed = Math.min(Math.max(input.elapsedDays, 1), input.daysInMonth);
  const hasSales = input.salesSoFar > 0;
  const projectedSales = hasSales ? Math.round((input.salesSoFar / elapsed) * input.daysInMonth) : 0;
  const projectedProfit = hasSales ? Math.round((input.profitSoFar / elapsed) * input.daysInMonth) : 0;
  const left = projectedProfit - input.bills;
  const gap = Math.max(goal - left, 0);
  const marginRate = hasSales ? input.profitSoFar / input.salesSoFar : 0;
  const extraSales = gap > 0 && marginRate > 0 ? Math.ceil(gap / marginRate) : null;
  const remainingDays = Math.max(input.daysInMonth - input.elapsedDays, 0);
  const perDay = extraSales != null && remainingDays > 0 ? Math.ceil(extraSales / remainingDays) : null;

  return {
    ...input,
    projectedSales,
    projectedProfit,
    left,
    gap,
    onTrack: hasSales && gap === 0,
    extraSales,
    perDay,
    remainingDays,
  };
}
