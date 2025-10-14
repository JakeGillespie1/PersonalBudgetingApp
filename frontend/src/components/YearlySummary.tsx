import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { YearlySummary as YearlySummaryType, AccountValue, MonthlyBudget } from '../types/budget';
import { budgetAPI } from '../services/api';

const YearlySummary: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState<YearlySummaryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountValue[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingAccountValues, setEditingAccountValues] = useState<Record<string, Record<number, string>>>({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(true);

  useEffect(() => {
    console.log('YearlySummary mounted or selectedYear changed:', selectedYear);
    console.log('Current accounts state:', accounts);
    console.log('Current editingAccountValues state:', editingAccountValues);
    loadYearlyData();
  }, [selectedYear]);

  useEffect(() => {
    console.log('Accounts state changed:', accounts);
  }, [accounts]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const generateYearlyDataFromMonthly = async (monthlyBudgets: MonthlyBudget[]) => {
    console.log('Processing:', monthlyBudgets.length, 'monthly budgets');
    
    // Get accounts from existing yearly data or initialize empty
    const accounts: AccountValue[] = [];
    
    // Initialize arrays for 12 months
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);
    const monthlySavings = new Array(12).fill(0);
    const monthlyProjectedIncome = new Array(12).fill(0);
    const monthlyProjectedExpenses = new Array(12).fill(0);
    
    // Process monthly budgets
    monthlyBudgets.forEach(budget => {
      const monthIndex = budget.month - 1; // Convert to 0-based index
      console.log(`Month ${budget.month}: Income=${budget.actualIncome.total}, Expenses=${budget.totalActualCost}`);
      console.log(`Month ${budget.month}: Projected Income=${budget.projectedIncome.total}, Projected Expenses=${budget.totalProjectedCost}`);
      monthlyIncome[monthIndex] = budget.actualIncome.total;
      monthlyExpenses[monthIndex] = budget.totalActualCost;
      monthlySavings[monthIndex] = budget.actualIncome.total - budget.totalActualCost;
      monthlyProjectedIncome[monthIndex] = budget.projectedIncome.total;
      monthlyProjectedExpenses[monthIndex] = budget.totalProjectedCost;
    });
    
    // Calculate totals and averages
    const yearlyIncomeTotal = monthlyIncome.reduce((sum: number, income: number) => sum + income, 0);
    const yearlyAverageIncome = yearlyIncomeTotal / 12;
    const yearlyExpensesTotal = monthlyExpenses.reduce((sum: number, expense: number) => sum + expense, 0);
    const yearlyAverageExpense = yearlyExpensesTotal / 12;
    const yearlySavingsTotal = monthlySavings.reduce((sum: number, saving: number) => sum + saving, 0);
    const yearlyAverageSavings = yearlySavingsTotal / 12;
    
    // Calculate net worth summary
    const monthlyNetWorth = [];
    let cumulativeSavings = 0;
    for (let i = 0; i < 12; i++) {
      cumulativeSavings += monthlySavings[i] || 0;
      monthlyNetWorth[i] = cumulativeSavings;
    }
    
    const netWorthSummary = {
      monthlyNetWorth,
      yearlyHigh: Math.max(...monthlyNetWorth),
      yearlyTotal: yearlySavingsTotal
    };
    
    return {
      id: '',
      year: selectedYear,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      monthlyProjectedIncome,
      monthlyProjectedExpenses,
      yearlyIncomeTotal,
      yearlyAverageIncome,
      yearlyExpensesTotal,
      yearlyAverageExpense,
      yearlySavingsTotal,
      yearlyAverageSavings,
      netWorthSummary,
      accountValues: accounts,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const initializeEditingState = () => {
    // Initialize editing state for accounts that don't have any pending changes
    const newEditingState = { ...editingAccountValues };
    accounts.forEach(account => {
      if (!newEditingState[account.id]) {
        // Create an empty editing state for this account if it doesn't exist
        newEditingState[account.id] = {};
      }
    });
    
    // Only update if there's actually a change
    if (JSON.stringify(newEditingState) !== JSON.stringify(editingAccountValues)) {
      setEditingAccountValues(newEditingState);
    }
  };

  const loadAccounts = async () => {
    try {
      console.log('Loading accounts...');
      const response = await budgetAPI.getAccounts();
      const accountsData = response.data.map(account => {
        console.log('Processing account from backend:', {
          id: account.id,
          name: account.name,
          monthlyValues: account.monthlyValues,
          monthlyValuesType: typeof account.monthlyValues,
          monthlyValuesLength: account.monthlyValues?.length
        });
        
        // Ensure monthlyValues exists and is an array of numbers
        const monthlyValues = Array.isArray(account.monthlyValues) 
          ? account.monthlyValues
          : new Array(12).fill(0);
          
        return {
          ...account,
          monthlyValues: monthlyValues
        };
      });
      console.log('Loaded accounts:', accountsData);
      
      // Log each account's monthly values
      accountsData.forEach(account => {
        console.log(`Account ${account.name} monthly values:`, account.monthlyValues);
      });
      
      setAccounts(accountsData);
      
      // Initialize editing state after accounts are loaded
      setTimeout(() => {
        initializeEditingState();
      }, 100);
    } catch (error) {
      console.log('No accounts found:', error);
      setAccounts([]);
    }
  };

  const loadYearlyData = async () => {
    setLoading(true);
    
    // Always load accounts independently first
    await loadAccounts();
    
    try {
      // Always generate yearly data from monthly budgets to ensure we have projected data
      const monthlyResponse = await budgetAPI.getMonthlyBudgetsForYear(selectedYear);
      console.log('Found monthly budgets:', monthlyResponse.data.length, 'budgets');
      
      if (monthlyResponse.data.length > 0) {
        const generatedYearlyData = await generateYearlyDataFromMonthly(monthlyResponse.data);
        console.log('Generated yearly data with projected values:', generatedYearlyData);
        setYearlyData(generatedYearlyData);
        // Use accounts already loaded from loadAccounts()
      } else {
        console.log('No monthly budgets found for', selectedYear);
        setYearlyData(null);
        // Keep existing accounts loaded from loadAccounts()
      }
    } catch (monthlyError) {
      console.log('Failed to load monthly budgets:', monthlyError);
      
      // Fallback: try to get existing yearly summary if monthly data fails
    try {
      const response = await budgetAPI.getYearlySummary(selectedYear);
        console.log('Fallback: Using existing yearly summary:', response.data);
      setYearlyData(response.data);
      } catch (yearlyError) {
        console.log('No yearly summary available');
      setYearlyData(null);
      }
      // Keep existing accounts loaded from loadAccounts()
    }
    setLoading(false);
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const addAccount = async () => {
    const name = newAccountName.trim();
    if (!name) return;

    const newAccount: AccountValue = {
      id: '',
      name,
      monthlyValues: new Array(12).fill(0),
      currentValue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const response = await budgetAPI.saveAccount(newAccount);
      setAccounts(prev => [...prev, response.data]);
      setNewAccountName('');
      // Don't set isDirty - account creation saves directly to database
      showToast(`Account "${name}" added successfully`, 'success');
    } catch (e) {
      showToast('Failed to add account', 'error');
    }
  };

  const handleDeleteAccountClick = (accountId: string, accountName: string) => {
    setAccountToDelete({ id: accountId, name: accountName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    
    try {
      await budgetAPI.deleteAccount(accountToDelete.id);
      setAccounts(prev => prev.filter(acc => acc.id !== accountToDelete.id));
      
      // Clean up any editing state for the deleted account
      setEditingAccountValues(prev => {
        const newState = { ...prev };
        delete newState[accountToDelete.id];
        return newState;
      });
      
      // Don't set isDirty - account deletion saves directly to database
      setDeleteConfirmOpen(false);
      setAccountToDelete(null);
      showToast(`Account "${accountToDelete.name}" deleted`, 'info');
    } catch (e) {
      showToast('Failed to delete account', 'error');
    }
  };

  const cancelDeleteAccount = () => {
    setDeleteConfirmOpen(false);
    setAccountToDelete(null);
  };

  const handleAccountValueChange = (accountId: string, monthIndex: number, value: string) => {
    setEditingAccountValues(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [monthIndex]: value
      }
    }));
    setIsDirty(true);
  };

  const handleAccountValueBlur = (accountId: string, monthIndex: number) => {
    // Don't clear editing state on blur - keep changes until manual save
    // The editing state will be cleared when user clicks "Save Changes"
  };

  const saveAllAccountChanges = async () => {
    setLoading(true);
    try {
      // Only process accounts that actually have pending changes
      const accountsWithChanges = accounts.filter(account => 
        editingAccountValues[account.id] && Object.keys(editingAccountValues[account.id]).length > 0
      );


      if (accountsWithChanges.length === 0) {
        setIsDirty(false);
        showToast('No changes to save', 'info');
        setLoading(false);
        return;
      }

      // Update each account that has changes
      for (const account of accountsWithChanges) {
        const editingValues = editingAccountValues[account.id];
        const updatedAccount = { ...account };
        
        
        // Apply pending changes to account's monthly values
        Object.entries(editingValues).forEach(([monthIndex, value]) => {
          const offset = parseInt(monthIndex);
          const numValue = value === '' || value === undefined ? 0 : Number(value);
          updatedAccount.monthlyValues[offset] = isNaN(numValue) ? 0 : numValue;
        });

        // Recalculate current value (sum of all monthly values)
        updatedAccount.currentValue = updatedAccount.monthlyValues.reduce((sum, val) => sum + val, 0);

        // Save to database
        await budgetAPI.updateAccount(updatedAccount);
        
        // Update local state immediately
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id ? updatedAccount : acc
        ));
      }

      // Clear editing state and reset button after successful save
      setIsDirty(false);
      setEditingAccountValues({});
      showToast('Account values saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving account values:', error);
      showToast('Failed to save account values', 'error');
    }
    setLoading(false);
  };


  const handleUnsavedChangesPrompt = () => {
    if (isDirty) {
      setUnsavedChangesOpen(true);
      return false;
    }
    return true;
  };

  const handleDiscardChanges = () => {
    setEditingAccountValues({});
    setIsDirty(false);
    setUnsavedChangesOpen(false);
  };

  const handleSaveAndContinue = () => {
    saveAllAccountChanges();
    setUnsavedChangesOpen(false);
  };

  const handleCancelUnsaved = () => {
    setUnsavedChangesOpen(false);
  };

  const refreshYearlyData = async () => {
    try {
      const response = await budgetAPI.refreshYearlySummary(selectedYear);
      setYearlyData(response.data);
    } catch (e) {
      console.log('Failed to refresh yearly data');
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      
      // Download ZIP file directly
      const response = await budgetAPI.exportYearlyData(selectedYear);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ExportedFinancialData${selectedYear}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast(`Successfully exported ExportedFinancialData${selectedYear}.zip`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthAbbreviations = months.map(m => m.substring(0, 3));

  // Get current date to determine which months to show
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

  // Determine how many months to show based on current date and selected year
  const monthsToShow = selectedYear === currentYear ? currentMonth : 12;

  // Calculate monthly savings (income - expenses)
  const monthlySavings = yearlyData ? yearlyData.monthlyIncome.map((income, index) => 
    income - (yearlyData.monthlyExpenses[index] || 0)
  ) : [];

  // Calculate net worth (cumulative savings + account values) - only up to current month
  const monthlyNetWorth: number[] = [];
  let cumulativeSavings = 0;
  for (let i = 0; i < monthsToShow; i++) {
    cumulativeSavings += monthlySavings[i] || 0;
    const accountValues = accounts.reduce((sum: number, acc: AccountValue) => {
      const accountTotal = acc.monthlyValues.slice(0, i + 1).reduce((total: number, val: number) => total + val, 0);
      return sum + accountTotal;
    }, 0);
    monthlyNetWorth[i] = cumulativeSavings + accountValues;
  }

  // Charts data - only show months up to and including current month
  const incomeChartData = months.slice(0, monthsToShow).map((month, index) => ({
    month: monthAbbreviations[index],
    income: yearlyData?.monthlyIncome[index] || 0,
    expenses: yearlyData?.monthlyExpenses[index] || 0,
    savings: monthlySavings[index] || 0,
    projectedIncome: yearlyData?.monthlyProjectedIncome?.[index] || 0,
    projectedExpenses: yearlyData?.monthlyProjectedExpenses?.[index] || 0
  }));

  const netWorthChartData = months.slice(0, monthsToShow).map((month, index) => ({
    month: monthAbbreviations[index],
    netWorth: monthlyNetWorth[index] || 0
  }));

  const accountChartData = months.slice(0, monthsToShow).map((month, index) => {
    const data: any = { 
      month: monthAbbreviations[index],
      total: 0 // This will be the sum of all accounts for this month
    };
    
    // Calculate total for all accounts in this month
    let monthTotal = 0;
    accounts.forEach(acc => {
      monthTotal += acc.monthlyValues[index] || 0;
    });
    data.total = monthTotal;
    
    return data;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" gutterBottom>
          Year In Review
      </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
              onChange={(e) => {
                if (handleUnsavedChangesPrompt()) {
                  setSelectedYear(Number(e.target.value));
                }
              }}
            label="Year"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
          
          <Button 
            variant="outlined" 
            onClick={handleExportData}
            disabled={loading}
          >
            Export All Budget Data
          </Button>
          
          {yearlyData && (
            <Button 
              variant="outlined" 
              onClick={() => {
                if (handleUnsavedChangesPrompt()) {
                  refreshYearlyData();
                }
              }}
            >
              Refresh Yearly Summary
            </Button>
          )}
        </Box>
      </Box>


      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">Loading yearly data...</Typography>
        </Box>
      )}

      {!loading && !yearlyData && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            No yearly summary available for {selectedYear}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            To generate a yearly summary from your monthly budget data, click the button below.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={refreshYearlyData}
          >
            Generate Yearly Summary from Monthly Data
          </Button>
        </Box>
      )}

      {yearlyData && (
        <>

          {/* 1. Income Section */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#2e7d32', color: 'white', p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                1. Total Yearly Income and Average Yearly Income
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#e8f5e8' }}>
                <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Total Yearly Income
                  </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: yearlyData.yearlyIncomeTotal > 0 ? '#2e7d32' : yearlyData.yearlyIncomeTotal < 0 ? '#d32f2f' : '#000' }}>
                    {formatCurrency(yearlyData.yearlyIncomeTotal)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#e8f5e8' }}>
                <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Average Monthly Income
                  </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {formatCurrency(yearlyData.yearlyAverageIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

              <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                  Monthly Income Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={incomeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(Number(value)), name]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke={yearlyData.monthlyIncome.some((val: number) => val < 0) ? '#d32f2f' : '#2e7d32'} 
                      strokeWidth={3}
                      dot={{ fill: '#2e7d32', strokeWidth: 2, r: 4 }}
                      name="Actual Income"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projectedIncome" 
                      stroke="#2e7d32" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 0 }}
                      name="Projected Income"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>

          {/* 2. Expenditures Section */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#d32f2f', color: 'white', p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                2. Total Yearly Expenditures and Average Monthly Expenditures
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#ffeaea' }}>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Total Yearly Expenditures
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                        {formatCurrency(yearlyData.yearlyExpensesTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#ffeaea' }}>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Average Monthly Expenditures
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                        {formatCurrency(yearlyData.yearlyAverageExpense)}
            </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Expenditures Trend
                    </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={incomeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(Number(value)), name]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#d32f2f" 
                      strokeWidth={3}
                      dot={{ fill: '#d32f2f', strokeWidth: 2, r: 4 }}
                      name="Actual Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projectedExpenses" 
                      stroke="#d32f2f" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 0 }}
                      name="Projected Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>

          {/* 3. Savings Section */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#1976d2', color: 'white', p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                3. Actual Yearly Savings (Income - Expenditures)
                    </Typography>
                  </Box>
            
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Total Yearly Savings
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: yearlyData.yearlySavingsTotal > 0 ? '#2e7d32' : yearlyData.yearlySavingsTotal < 0 ? '#d32f2f' : '#000' }}>
                        {formatCurrency(yearlyData.yearlySavingsTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary">
                        Average Monthly Savings
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: yearlyData.yearlyAverageSavings > 0 ? '#2e7d32' : yearlyData.yearlyAverageSavings < 0 ? '#d32f2f' : '#000' }}>
                        {formatCurrency(yearlyData.yearlyAverageSavings)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
            </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Savings Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={incomeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Savings']} />
                    <Line 
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#1976d2"
                      strokeWidth={3}
                      dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>

          {/* 4. Account Management Section */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ backgroundColor: '#1976d2', color: 'white', p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Investment/Account Tracking
              </Typography>
            </Box>
            
               <Box sx={{ p: 2 }}>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Typography variant="h6">Account Values</Typography>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <Button variant="contained" onClick={saveAllAccountChanges} disabled={loading || !isDirty}>
                     {isDirty ? 'Save Changes' : 'Values Saved!'}
                   </Button>
                   <IconButton 
                     onClick={() => setShowAccountDetails(!showAccountDetails)}
                     size="small"
                   >
                     {showAccountDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                   </IconButton>
                 </Box>
               </Box>
              
              {showAccountDetails && (
                <>
                  {accounts.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No accounts added yet. Enter a name in the input field below to add your first account.
            </Typography>
                  ) : (
                 <TableContainer sx={{ 
                   maxWidth: '100%', 
                   overflowX: 'auto',
                   '&::-webkit-scrollbar': {
                     height: '8px',
                   },
                   '&::-webkit-scrollbar-track': {
                     backgroundColor: '#f5f5f5',
                   },
                   '&::-webkit-scrollbar-thumb': {
                     backgroundColor: '#c1c1c1',
                     borderRadius: '4px',
                   },
                   '&::-webkit-scrollbar-thumb:hover': {
                     backgroundColor: '#a1a1a1',
                   }
                 }}>
                   <Table sx={{ 
                     minWidth: 370,
                     '& .MuiTableCell-root': { 
                       padding: '4px 2px',
                       fontSize: '0.8rem'
                     }
                   }}>
                     <TableHead>
                       <TableRow>
                         <TableCell sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>Account</TableCell>
                         {monthAbbreviations.slice(0, monthsToShow).map((month, index) => (
                           <TableCell key={index} sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold', textAlign: 'center' }}>
                             {month}
                           </TableCell>
                         ))}
                         <TableCell sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                           Actions
                         </TableCell>
                       </TableRow>
                     </TableHead>
                    <TableBody>
                      {accounts.map(account => (
                        <TableRow key={account.id}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{account.name}</TableCell>
                          {account.monthlyValues.slice(0, monthsToShow).map((value, index) => {
                            const displayValue = editingAccountValues[account.id]?.[index] !== undefined 
                              ? editingAccountValues[account.id][index]
                              : value !== null && value !== undefined 
                                ? String(value)
                                : '0';
                            
                            // Debug logging for first account, first month only
                            if (account === accounts[0] && index === 0) {
                              console.log(`Account ${account.name}, Month ${index}:`, {
                                originalValue: value,
                                editingValue: editingAccountValues[account.id]?.[index],
                                displayValue: displayValue,
                                accountMonthlyValues: account.monthlyValues
                              });
                            }
                            
                            return (
                            <TableCell key={index} align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={displayValue}
                                onChange={(e) => handleAccountValueChange(account.id, index, e.target.value)}
                                onFocus={() => {
                                  // Clear zero values on focus to avoid confusion
                                  const current = editingAccountValues[account.id]?.[index] ?? String(value || 0);
                                  if (current === '0') {
                                    setEditingAccountValues(prev => ({
                                      ...prev,
                                      [account.id]: {
                                        ...prev[account.id],
                                        [index]: ''
                                      }
                                    }));
                                  }
                                }}
                                onBlur={() => handleAccountValueBlur(account.id, index)}
                                sx={{ 
                                  width: 65,
                                  '& input[type="number"]': {
                                    MozAppearance: 'textfield',
                                  },
                                  '& input[type="number"]::-webkit-outer-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                  '& input[type="number"]::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  }
                                }}
                                inputProps={{ 
                                  step: "0.01",
                                  style: { MozAppearance: 'textfield' }
                                }}
                              />
                            </TableCell>
                            );
                          })}
                          <TableCell>
                            <IconButton 
                              onClick={() => handleDeleteAccountClick(account.id, account.name)}
                              size="small"
                              sx={{ color: '#757575' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Add New Account Row */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    placeholder="New account name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    size="small"
                    sx={{ width: 200 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={addAccount}
                    disabled={!newAccountName.trim()}
                    sx={{
                      backgroundColor: newAccountName.trim() ? '#1976d2' : 'transparent',
                      color: newAccountName.trim() ? 'white' : '#1976d2',
                      borderColor: '#1976d2',
                      '&:hover': {
                        backgroundColor: newAccountName.trim() ? '#1565c0' : '#f5f5f5',
                        borderColor: '#1976d2',
                      }
                    }}
                  >
                    ADD ACCOUNT
                  </Button>
                </Box>
              </Box>
                </>
              )}
              
              {accounts.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Total Net Worth Chart</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accountChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total Net Worth']} />
                <Line 
                  type="monotone" 
                        dataKey="total" 
                  stroke="#1976d2" 
                        strokeWidth={3}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
                </Box>
              )}
            </Box>
          </Paper>
        </>
      )}


      {/* Confirm Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDeleteAccount}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete account "{accountToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAccount}>Cancel</Button>
          <Button color="error" onClick={confirmDeleteAccount}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={unsavedChangesOpen} onClose={handleCancelUnsaved}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes to your account monthly values. What would you like to do?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUnsaved}>Cancel</Button>
          <Button onClick={handleDiscardChanges} color="secondary">Discard Changes</Button>
          <Button onClick={handleSaveAndContinue} color="primary" variant="contained">Save & Continue</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default YearlySummary;