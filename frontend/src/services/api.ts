import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { MonthlyBudget, YearlySummary, BudgetTemplate, AccountValue } from '../types/budget';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Firebase ID token if available
api.interceptors.request.use(async (config) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : undefined;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export const budgetAPI = {
  // Monthly Budgets
  getMonthlyBudgets: () => api.get<MonthlyBudget[]>('/budgets/monthly'),
  getMonthlyBudget: (year: number, month: number) => 
    api.get<MonthlyBudget>(`/budgets/monthly/${year}/${month}`),
  getMonthlyBudgetsForYear: (year: number) => 
    api.get<MonthlyBudget[]>(`/budgets/monthly?year=${year}`),
  saveMonthlyBudget: (budget: MonthlyBudget) => 
    api.post<MonthlyBudget>('/budgets/monthly', budget),
  
  // Yearly Summaries
  getYearlySummary: (year: number) => 
    api.get<YearlySummary>(`/budgets/yearly/${year}`),
  refreshYearlySummary: (year: number) => 
    api.post<YearlySummary>(`/budgets/yearly/${year}/refresh`),
  exportYearlyData: (year: number) => 
    api.get(`/budgets/yearly/${year}/export`, { responseType: 'blob' }),
    
  // Templates
  getTemplates: () => api.get<BudgetTemplate[]>('/budgets/templates'),
  saveTemplate: (template: BudgetTemplate) => 
    api.post<BudgetTemplate>('/budgets/templates', template),
  deleteTemplate: (templateId: string) => 
    api.delete(`/budgets/templates/${templateId}`),
    
  // Accounts
  getAccounts: () => api.get<AccountValue[]>('/budgets/accounts'),
  saveAccount: (account: AccountValue) => 
    api.post<AccountValue>('/budgets/accounts', account),
  updateAccount: (account: AccountValue) => 
    api.put<AccountValue>(`/budgets/accounts/${account.id}`, account),
  deleteAccount: (accountId: string) => 
    api.delete(`/budgets/accounts/${accountId}`),
};

export default api;