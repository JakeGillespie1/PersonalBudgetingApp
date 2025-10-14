export interface Income {
  regular: number;
  extra: number;
  total: number;
}

export interface ExpenseTransaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date
  createdAt: Date;
}

export interface ExpenseItem {
  subCategory: string;
  projectedCost: number;
  actualCost: number;
  difference: number;
  transactions?: ExpenseTransaction[]; // Optional for backward compatibility
}
  
export interface ExpenseCategory {
    name: string;
    items: ExpenseItem[];
    subtotal: {
      projected: number;
      actual: number;
      difference: number;
    };
  }
  
export interface MonthlyBudget {
    id: string;
    year: number;
    month: number;
    projectedIncome: Income;
    actualIncome: Income;
    projectedExpenses: ExpenseCategory[];
    actualExpenses: ExpenseCategory[];
    projectedBalance: number;
    actualBalance: number;
    difference: number;
    totalProjectedCost: number;
    totalActualCost: number;
    totalDifference: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
export interface AccountValue {
  id: string;
  name: string;
  monthlyValues: number[];
  currentValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetWorthSummary {
  monthlyNetWorth: number[];
  yearlyHigh: number;
  yearlyTotal: number;
}

export interface YearlySummary {
    id: string;
    year: number;
    monthlyIncome: number[];
    monthlyExpenses: number[];
    monthlySavings: number[];
    monthlyProjectedIncome?: number[];
    monthlyProjectedExpenses?: number[];
    yearlyExpensesTotal: number;
    yearlyAverageExpense: number;
    yearlyIncomeTotal: number;
    yearlyAverageIncome: number;
    yearlySavingsTotal: number;
    yearlyAverageSavings: number;
    netWorthSummary: NetWorthSummary;
    accountValues: AccountValue[];
    createdAt: Date;
    updatedAt: Date;
  }

export interface BudgetTemplate {
  id: string;
  name: string;
  description?: string;
  projectedIncome: Income;
  expenseCategories: ExpenseCategory[];
  createdAt: Date;
  updatedAt: Date;
}