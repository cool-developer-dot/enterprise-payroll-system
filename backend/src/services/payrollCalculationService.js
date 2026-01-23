import User from '../models/User.js';
import Timesheet from '../models/Timesheet.js';
import PayStub from '../models/PayStub.js';
import PayrollCalculation from '../models/PayrollCalculation.js';
import Setting from '../models/Setting.js';

const getPayrollSettings = async () => {
  const settings = await Setting.findOne({ type: 'payroll' });
  return settings?.payroll || {
    overtimeRules: { enabled: true, rate: 1.5, threshold: 40 },
    taxSettings: {
      federalRate: 0.12,
      stateRate: 0.05,
      localRate: 0.01,
      socialSecurityRate: 0.062,
      medicareRate: 0.0145,
    },
    bonuses: [],
    deductions: [],
  };
};

export const calculateGrossPay = async (employee, hours, periodStart, periodEnd) => {
  // System uses monthly salary only
  // For monthly employees, gross pay is the base salary for the pay period
  const baseSalary = employee.baseSalary || 0;
  
  // Calculate the proportion of the month covered by this pay period
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Get days in the month of the period
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Calculate prorated monthly salary based on days in period
  const grossPay = (baseSalary / daysInMonth) * daysInPeriod;
  
  return Math.max(0, Math.round(grossPay * 100) / 100);
};

export const calculateOvertimePay = async (employee, totalHours, regularHours) => {
  // System uses monthly salary only - overtime is not applicable for salaried employees
  // Overtime calculations are handled through timesheets for additional compensation
  // For monthly salary employees, base salary is fixed regardless of hours worked
  return {
    overtimeHours: 0,
    overtimePay: 0,
  };
};

export const calculateTaxes = async (grossPay, employee) => {
  const settings = await getPayrollSettings();
  const taxSettings = settings.taxSettings || {};

  const federal = grossPay * (taxSettings.federalRate || 0.12);
  const state = grossPay * (taxSettings.stateRate || 0.05);
  const local = grossPay * (taxSettings.localRate || 0.01);
  
  const socialSecurityWageBase = 160200;
  const ytdGross = await getYTDGrossPay(employee._id, new Date().getFullYear());
  const taxableSS = Math.min(grossPay, Math.max(0, socialSecurityWageBase - ytdGross));
  const socialSecurity = taxableSS * (taxSettings.socialSecurityRate || 0.062);
  
  const medicare = grossPay * (taxSettings.medicareRate || 0.0145);

  const total = federal + state + local + socialSecurity + medicare;

  return {
    federal: Math.round(federal * 100) / 100,
    state: Math.round(state * 100) / 100,
    local: Math.round(local * 100) / 100,
    socialSecurity: Math.round(socialSecurity * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

export const calculateDeductions = async (grossPay, employee) => {
  const settings = await getPayrollSettings();
  const deductions = settings.deductions || [];
  const benefits = [];
  const other = [];
  let totalDeductions = 0;

  for (const deduction of deductions) {
    if (!deduction.enabled) continue;

    let amount = 0;
    if (deduction.type === 'fixed') {
      amount = deduction.value || 0;
    } else if (deduction.type === 'percentage') {
      amount = grossPay * ((deduction.value || 0) / 100);
    }

    if (deduction.mandatory || deduction.name?.toLowerCase().includes('benefit')) {
      benefits.push({
        name: deduction.name,
        type: deduction.type,
        value: deduction.value,
        amount: Math.round(amount * 100) / 100,
      });
    } else {
      other.push({
        name: deduction.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    totalDeductions += amount;
  }

  return {
    benefits,
    other,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
  };
};

export const calculateNetPay = (grossPay, taxes, deductions) => {
  const totalDeductions = taxes.total + deductions.totalDeductions;
  const netPay = grossPay - totalDeductions;
  return Math.max(0, Math.round(netPay * 100) / 100);
};

export const getYTDGrossPay = async (employeeId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const paystubs = await PayStub.find({
    employeeId,
    payDate: { $gte: startOfYear, $lte: endOfYear },
    status: 'paid',
  }).lean();

  return paystubs.reduce((sum, ps) => sum + (ps.grossPay || 0), 0);
};

export const getYTDTaxes = async (employeeId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const paystubs = await PayStub.find({
    employeeId,
    payDate: { $gte: startOfYear, $lte: endOfYear },
    status: 'paid',
  }).lean();

  return paystubs.reduce((sum, ps) => sum + ((ps.taxes?.total || 0)), 0);
};

export const getYTDNetPay = async (employeeId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const paystubs = await PayStub.find({
    employeeId,
    payDate: { $gte: startOfYear, $lte: endOfYear },
    status: 'paid',
  }).lean();

  return paystubs.reduce((sum, ps) => sum + (ps.netPay || 0), 0);
};

export const calculateYTD = async (employeeId, periodEnd) => {
  const year = new Date(periodEnd).getFullYear();
  
  const [ytdGrossPay, ytdTaxes, ytdNetPay] = await Promise.all([
    getYTDGrossPay(employeeId, year),
    getYTDTaxes(employeeId, year),
    getYTDNetPay(employeeId, year),
  ]);

  return {
    ytdGrossPay: Math.round(ytdGrossPay * 100) / 100,
    ytdTaxes: Math.round(ytdTaxes * 100) / 100,
    ytdNetPay: Math.round(ytdNetPay * 100) / 100,
  };
};

export const getEmployeeHours = async (employeeId, periodStart, periodEnd) => {
  const timesheets = await Timesheet.find({
    employeeId,
    date: { $gte: periodStart, $lte: periodEnd },
    status: 'approved',
  }).lean();

  let regularHours = 0;
  let overtimeHours = 0;
  let totalHours = 0;

  timesheets.forEach(ts => {
    const hours = ts.hours || 0;
    totalHours += hours;
    
    if (ts.regularHours !== undefined) {
      regularHours += ts.regularHours;
      overtimeHours += (ts.overtimeHours || 0);
    } else {
      regularHours += hours;
    }
  });

  return {
    regular: Math.round(regularHours * 100) / 100,
    overtime: Math.round(overtimeHours * 100) / 100,
    doubleTime: 0,
    total: Math.round(totalHours * 100) / 100,
  };
};

import PayrollPeriod from '../models/PayrollPeriod.js';

export const processPayrollForPeriod = async (periodId, processedBy) => {
  const period = await PayrollPeriod.findById(periodId);
  if (!period) {
    throw new Error('Payroll period not found');
  }

  const employees = await User.find({
    status: 'active',
    ...(period.departmentId && { departmentId: period.departmentId }),
  }).lean();

  const paystubs = [];
  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;
  let totalTaxes = 0;

  for (const employee of employees) {
    try {
      // Skip if employee doesn't have a base salary (monthly salary required)
      if (!employee.baseSalary || employee.baseSalary <= 0) {
        console.warn(`Skipping employee ${employee._id} - no monthly salary set`);
        continue;
      }

      // System uses monthly salary only - gross pay is prorated based on days in pay period
      // Hours are tracked for reporting but not used for payroll calculation
      const hours = await getEmployeeHours(employee._id, period.periodStart, period.periodEnd);
      const grossPay = await calculateGrossPay(employee, null, period.periodStart, period.periodEnd);
      const taxes = await calculateTaxes(grossPay, employee);
      const deductions = await calculateDeductions(grossPay, employee);
      const netPay = calculateNetPay(grossPay, taxes, deductions);
      const ytd = await calculateYTD(employee._id, period.periodEnd);

      // Monthly salary rate for display purposes
      const monthlyRate = employee.baseSalary || 0;

      const paystub = await PayStub.create({
        employeeId: employee._id,
        payrollPeriodId: periodId,
        payPeriodStart: period.periodStart,
        payPeriodEnd: period.periodEnd,
        payDate: period.payDate,
        status: 'processing',
        grossPay,
        regularHours: hours.regular || 0,
        regularRate: monthlyRate, // Monthly salary rate
        overtimeHours: 0, // Overtime not applicable for monthly salary employees
        overtimeRate: 0,
        overtimePay: 0,
        bonuses: [],
        totalEarnings: grossPay,
        taxes,
        deductions: [...deductions.benefits, ...deductions.other],
        totalDeductions: taxes.total + deductions.totalDeductions,
        netPay,
        ytdGrossPay: ytd.ytdGrossPay,
        ytdNetPay: ytd.ytdNetPay,
        ytdTaxes: ytd.ytdTaxes,
      });

      await PayrollCalculation.create({
        paystubId: paystub._id,
        employeeId: employee._id,
        payrollPeriodId: periodId,
        hours,
        earnings: {
          baseSalary: employee.baseSalary || 0,
          hourlyRate: 0, // Not applicable - system uses monthly salary only
          regularPay: grossPay, // For monthly employees, regular pay equals gross pay
          overtimePay: 0, // Overtime not applicable for monthly salary employees
          bonuses: [],
          allowances: [],
          totalEarnings: grossPay,
        },
        deductions: {
          taxes,
          benefits: deductions.benefits,
          other: deductions.other,
          totalDeductions: taxes.total + deductions.totalDeductions,
        },
        netPay,
        calculatedBy: processedBy,
        calculationVersion: '1.0',
      });

      paystubs.push(paystub);
      totalGrossPay += grossPay;
      totalDeductions += taxes.total + deductions.totalDeductions;
      totalNetPay += netPay;
      totalTaxes += taxes.total;
    } catch (error) {
      console.error(`Error processing payroll for employee ${employee._id}:`, error);
    }
  }

  await PayrollPeriod.findByIdAndUpdate(periodId, {
    status: 'processing',
    employeeCount: paystubs.length,
    totalGrossPay,
    totalDeductions,
    totalNetPay,
    totalTaxes,
    totalAmount: totalNetPay,
    processedBy,
    processedAt: new Date(),
  });

  return { paystubs, totals: { totalGrossPay, totalDeductions, totalNetPay, totalTaxes } };
};

export const generatePaystub = async (paystubId) => {
  const paystub = await PayStub.findById(paystubId)
    .populate('employeeId', 'name email employeeId')
    .populate('payrollPeriodId')
    .lean();

  if (!paystub) {
    throw new Error('Paystub not found');
  }

  return paystub;
};

