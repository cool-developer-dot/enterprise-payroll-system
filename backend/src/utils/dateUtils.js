export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;
  const d = new Date(date);
  
  if (format === 'YYYY-MM-DD') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'MM/DD/YYYY') {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }
  
  return d.toISOString();
};

export const getDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

export const getPayPeriod = (date = new Date(), cycle = 'monthly', payDay = null) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Normalize to start of day
  let periodStart, periodEnd;
  
  if (cycle === 'monthly') {
    periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
    periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
  } else if (cycle === 'bi-weekly') {
    // Bi-weekly: 14-day periods, typically starting from a reference date
    // For simplicity, we'll use the 1st and 16th of the month as period boundaries
    const dayOfMonth = d.getDate();
    if (dayOfMonth <= 15) {
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
      periodEnd = new Date(d.getFullYear(), d.getMonth(), 15);
    } else {
      periodStart = new Date(d.getFullYear(), d.getMonth(), 16);
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
    periodEnd.setHours(23, 59, 59, 999);
  } else if (cycle === 'semi-monthly') {
    // Semi-monthly: two periods per month, typically 1st-15th and 16th-end
    const dayOfMonth = d.getDate();
    if (dayOfMonth <= 15) {
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
      periodEnd = new Date(d.getFullYear(), d.getMonth(), 15);
    } else {
      periodStart = new Date(d.getFullYear(), d.getMonth(), 16);
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
    periodEnd.setHours(23, 59, 59, 999);
  } else if (cycle === 'weekly') {
    // Weekly: Monday to Sunday
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to subtract to get Monday
    periodStart = new Date(d);
    periodStart.setDate(d.getDate() + diff);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  } else {
    // Default to monthly
    periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
    periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
  }
  
  return { periodStart, periodEnd };
};

/**
 * Calculate the pay date for a given period based on cycle and payDay settings
 */
export const calculatePayDate = (periodEnd, cycle, payDay) => {
  const payDate = new Date(periodEnd);
  
  if (cycle === 'monthly' && payDay) {
    // Monthly: pay on a specific day of the following month
    payDate.setMonth(payDate.getMonth() + 1);
    payDate.setDate(Math.min(payDay, new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0).getDate()));
  } else if (cycle === 'bi-weekly' || cycle === 'weekly') {
    // Bi-weekly/Weekly: typically pay 3-5 days after period ends
    payDate.setDate(payDate.getDate() + (payDay || 3));
  } else if (cycle === 'semi-monthly') {
    // Semi-monthly: pay on a specific day of the same or following month
    if (periodEnd.getDate() <= 15) {
      // First half of month - pay on specified day of same month
      payDate.setDate(Math.min(payDay || 20, new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0).getDate()));
    } else {
      // Second half - pay on specified day of following month
      payDate.setMonth(payDate.getMonth() + 1);
      payDate.setDate(Math.min(payDay || 5, new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0).getDate()));
    }
  }
  
  return payDate;
};

export const isBusinessDay = (date, workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) => {
  const d = new Date(date);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return workingDays.includes(dayName);
};

export const calculateBusinessDays = (startDate, endDate, workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    if (isBusinessDay(current, workingDays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
};


