export interface Income {
    regular: number;
    extra: number;
    total: number;
  }
  
export interface ExpenseItem {
    subCategory: string;
    projectedCost: number;
    actualCost: number;
    difference: number;
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
  
export interface YearlySummary {
    id: string;
    year: number;
    monthlyIncome: number[];
    monthlyExpenses: number[];
    yearlyExpensesTotal: number;
    yearlyAverageExpense: number;
    yearlyIncomeTotal: number;
    yearlyAverageIncome: number;
    createdAt: Date;
    updatedAt: Date;
  }