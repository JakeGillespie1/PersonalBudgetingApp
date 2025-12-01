import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import type { MonthlyBudget as MonthlyBudgetModel, Income, ExpenseCategory, BudgetTemplate, ExpenseTransaction } from '../types/budget';
import { budgetAPI } from '../services/api';

interface MonthlyBudgetProps {
  budget: MonthlyBudgetModel | null;
  onBudgetChange: (budget: MonthlyBudgetModel | null) => void;
}

const MonthlyBudget: React.FC<MonthlyBudgetProps> = ({ budget, onBudgetChange }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<Record<number, string>>({});
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [editingIncomeValues, setEditingIncomeValues] = useState<Record<string, string>>({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [isDirty, setIsDirty] = useState(false);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ 
    type: 'category' | 'subcategory' | 'template' | 'transaction'; 
    categoryIndex?: number; 
    itemIndex?: number; 
    templateId?: string;
    transactionId?: string;
    label: string 
  } | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});
  const [newTransaction, setNewTransaction] = useState<{
    description: string;
    amount: string;
    date: string;
  }>({ description: '', amount: '', date: '' });
  const [addingTransaction, setAddingTransaction] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const defaultExpenseCategories: ExpenseCategory[] = [
    {
      name: 'Category',
      items: [
        { subCategory: 'Subcategory1', projectedCost: 0, actualCost: 0, difference: 0, transactions: [] },
        { subCategory: 'Subcategory2', projectedCost: 0, actualCost: 0, difference: 0, transactions: [] },
        { subCategory: 'Subcategory3', projectedCost: 0, actualCost: 0, difference: 0, transactions: [] },
        { subCategory: 'Subcategory4', projectedCost: 0, actualCost: 0, difference: 0, transactions: [] },
        { subCategory: 'Subcategory5', projectedCost: 0, actualCost: 0, difference: 0, transactions: [] },
      ],
      subtotal: { projected: 0, actual: 0, difference: 0 }
    }
  ];

  const [currentBudget, setCurrentBudget] = useState<MonthlyBudgetModel>({
    id: '',
    year: selectedYear,
    month: selectedMonth,
    projectedIncome: { regular: 0, extra: 0, total: 0 },
    actualIncome: { regular: 0, extra: 0, total: 0 },
    projectedExpenses: defaultExpenseCategories,
    actualExpenses: defaultExpenseCategories,
    projectedBalance: 0,
    actualBalance: 0,
    difference: 0,
    totalProjectedCost: 0,
    totalActualCost: 0,
    totalDifference: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  useEffect(() => {
    loadBudget();
    loadTemplates();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        const target = event.target as HTMLElement;
        // Only prevent default if not in an input/textarea (to allow normal save in those fields)
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          event.preventDefault();
        }
        // Always trigger save if there are unsaved changes
        if (isDirty && !loading) {
          void saveBudget();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, loading]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadBudget = async () => {
    setLoading(true);
    try {
      const response = await budgetAPI.getMonthlyBudget(selectedYear, selectedMonth);
      
      // Ensure all expense items have transactions array initialized
      const budgetData = response.data;
      budgetData.actualExpenses.forEach(category => {
        category.items.forEach(item => {
          if (!item.transactions) {
            item.transactions = [];
          }
        });
      });
      
      setCurrentBudget(budgetData);
      onBudgetChange(budgetData);
      setIsDirty(false);
    } catch (error) {
      console.log('No existing budget found, using default');
      const newBudget: MonthlyBudgetModel = {
        id: '',
        year: selectedYear,
        month: selectedMonth,
        projectedIncome: { regular: 0, extra: 0, total: 0 },
        actualIncome: { regular: 0, extra: 0, total: 0 },
        projectedExpenses: JSON.parse(JSON.stringify(defaultExpenseCategories)),
        actualExpenses: JSON.parse(JSON.stringify(defaultExpenseCategories)),
        projectedBalance: 0,
        actualBalance: 0,
        difference: 0,
        totalProjectedCost: 0,
        totalActualCost: 0,
        totalDifference: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setCurrentBudget(newBudget);
      onBudgetChange(newBudget);
      setIsDirty(false);
    }
    setLoading(false);
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const loadTemplates = async () => {
    try {
      const response = await budgetAPI.getTemplates();
      setTemplates(response.data);
    } catch (e) {
      console.log('No templates found');
    }
  };

  const saveCurrentBudget = async (updated: MonthlyBudgetModel) => {
    try {
      const response = await budgetAPI.saveMonthlyBudget(updated);
      setCurrentBudget(response.data);
      onBudgetChange(response.data);
    } catch (e) {
      showToast('Failed to save changes', 'error');
    }
  };

  const calculateTotals = (budget: MonthlyBudgetModel): MonthlyBudgetModel => {
    // Calculate income totals
    budget.projectedIncome.total = budget.projectedIncome.regular + budget.projectedIncome.extra;
    budget.actualIncome.total = budget.actualIncome.regular + budget.actualIncome.extra;

    // Calculate expense subtotals (including transactions)
    budget.projectedExpenses.forEach(category => {
      category.subtotal.projected = category.items.reduce((sum, item) => sum + item.projectedCost, 0);
      // Projected costs don't use transactions
      category.subtotal.actual = category.items.reduce((sum, item) => sum + item.actualCost, 0);
      category.subtotal.difference = category.subtotal.actual - category.subtotal.projected;
    });

    budget.actualExpenses.forEach(category => {
      category.subtotal.projected = category.items.reduce((sum, item) => sum + item.projectedCost, 0);
      // Actual costs include transaction totals
      category.subtotal.actual = category.items.reduce((sum, item) => {
        const transactionTotal = item.transactions?.reduce((tSum, t) => tSum + t.amount, 0) || 0;
        return sum + Math.max(item.actualCost, transactionTotal);
      }, 0);
      category.subtotal.difference = category.subtotal.actual - category.subtotal.projected;
    });

    // Calculate total costs
    budget.totalProjectedCost = budget.projectedExpenses.reduce((sum, category) => sum + category.subtotal.projected, 0);
    budget.totalActualCost = budget.actualExpenses.reduce((sum, category) => sum + category.subtotal.actual, 0);
    budget.totalDifference = budget.totalActualCost - budget.totalProjectedCost;

    // Calculate balances
    budget.projectedBalance = budget.projectedIncome.total - budget.totalProjectedCost;
    budget.actualBalance = budget.actualIncome.total - budget.totalActualCost;
    budget.difference = budget.actualBalance - budget.projectedBalance;

    return budget;
  };

  // Transaction management functions
  const addTransaction = (categoryIndex: number, itemIndex: number, type: 'actual') => {
    const description = newTransaction.description.trim();
    const amount = parseFloat(newTransaction.amount);
    const date = newTransaction.date;

    if (!description || isNaN(amount) || amount <= 0 || !date) return;

    const updatedBudget = { ...currentBudget };
    const expenseCategory = updatedBudget[`${type}Expenses`][categoryIndex];
    const expenseItem = expenseCategory.items[itemIndex];

    // Initialize transactions array if it doesn't exist
    if (!expenseItem.transactions) {
      expenseItem.transactions = [];
    }

    const transaction: ExpenseTransaction = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      amount,
      date,
      createdAt: new Date()
    };

    expenseItem.transactions.push(transaction);

    const calculatedBudget = calculateTotals(updatedBudget);
    setCurrentBudget(calculatedBudget);
    onBudgetChange(calculatedBudget);
    setIsDirty(true);

    // Reset form
    setNewTransaction({ description: '', amount: '', date: '' });
    setAddingTransaction(null);
  };


  const deleteTransactionFromItem = (categoryIndex: number, itemIndex: number, transactionId: string) => {
    const updatedBudget = { ...currentBudget };
    const expenseCategory = updatedBudget.actualExpenses[categoryIndex];
    const expenseItem = expenseCategory.items[itemIndex];

    if (!expenseItem.transactions) return;

    expenseItem.transactions = expenseItem.transactions.filter(t => t.id !== transactionId);

    const calculatedBudget = calculateTotals(updatedBudget);
    setCurrentBudget(calculatedBudget);
    onBudgetChange(calculatedBudget);
    setIsDirty(true);
  };

  const toggleTransactionExpansion = (categoryIndex: number, itemIndex: number, type: 'actual') => {
    const key = `${type}-${categoryIndex}-${itemIndex}`;
    setExpandedTransactions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startAddingTransaction = (categoryIndex: number, itemIndex: number) => {
    setAddingTransaction(`${categoryIndex}-${itemIndex}`);
    setNewTransaction({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const cancelAddingTransaction = () => {
    setAddingTransaction(null);
    setNewTransaction({ description: '', amount: '', date: '' });
  };

  const handleIncomeChange = (type: 'projected' | 'actual', field: 'regular' | 'extra', value: number) => {
    const updatedBudget = { ...currentBudget };
    updatedBudget[`${type}Income`][field] = value;
    const calculatedBudget = calculateTotals(updatedBudget);
    setCurrentBudget(calculatedBudget);
    onBudgetChange(calculatedBudget);
    setIsDirty(true);
  };

  const handleIncomeInputChange = (
    type: 'projected' | 'actual',
    field: 'regular' | 'extra',
    rawValue: string
  ) => {
    const key = `income-${type}-${field}`;
    setEditingIncomeValues(prev => ({ ...prev, [key]: rawValue }));
    setIsDirty(true);
  };

  const handleIncomeInputBlur = (
    type: 'projected' | 'actual',
    field: 'regular' | 'extra'
  ) => {
    const key = `income-${type}-${field}`;
    const raw = editingIncomeValues[key];
    const value = raw === '' || raw === undefined ? 0 : Number(raw);
    handleIncomeChange(type, field, isNaN(value) ? 0 : value);
    setEditingIncomeValues(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleExpenseChange = (type: 'projected' | 'actual', categoryIndex: number, itemIndex: number, field: 'projectedCost' | 'actualCost', value: number) => {
    const updatedBudget = { ...currentBudget };
    updatedBudget[`${type}Expenses`][categoryIndex].items[itemIndex][field] = value;
    const calculatedBudget = calculateTotals(updatedBudget);
    setCurrentBudget(calculatedBudget);
    onBudgetChange(calculatedBudget);
    setIsDirty(true);
  };

  const handleNumberInputChange = (
    type: 'projected' | 'actual',
    categoryIndex: number,
    itemIndex: number,
    field: 'projectedCost' | 'actualCost',
    rawValue: string
  ) => {
    const key = `${type}-${categoryIndex}-${itemIndex}-${field}`;
    setEditingValues(prev => ({ ...prev, [key]: rawValue }));
    setIsDirty(true);
  };

  const handleNumberInputBlur = (
    type: 'projected' | 'actual',
    categoryIndex: number,
    itemIndex: number,
    field: 'projectedCost' | 'actualCost'
  ) => {
    const key = `${type}-${categoryIndex}-${itemIndex}-${field}`;
    const raw = editingValues[key];
    const value = raw === '' || raw === undefined ? 0 : Number(raw);
    handleExpenseChange(type, categoryIndex, itemIndex, field, isNaN(value) ? 0 : value);
    setEditingValues(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const exists = currentBudget.projectedExpenses.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast(`Category "${name}" already exists`, 'error');
      return;
    }
    const newCat: ExpenseCategory = { name, items: [], subtotal: { projected: 0, actual: 0, difference: 0 } };
    const updated: MonthlyBudgetModel = {
      ...currentBudget,
      projectedExpenses: [...currentBudget.projectedExpenses, { ...newCat }],
      actualExpenses: [...currentBudget.actualExpenses, { ...newCat }],
    };
    const calculated = calculateTotals(updated);
    setCurrentBudget(calculated);
    onBudgetChange(calculated);
    setNewCategoryName('');
    showToast(`Successfully added new category titled: "${name}"`, 'success');
    void saveCurrentBudget(calculated);
  };

  const addSubcategory = (categoryIndex: number) => {
    const name = (newSubcategoryNames[categoryIndex] || '').trim();
    if (!name) return;
    const projCat = currentBudget.projectedExpenses[categoryIndex];
    const exists = projCat.items.some(i => i.subCategory.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast(`Subcategory "${name}" already exists in ${projCat.name}`, 'error');
      return;
    }
    const updated = { ...currentBudget } as MonthlyBudgetModel;
    const newItem = { subCategory: name, projectedCost: 0, actualCost: 0, difference: 0, transactions: [] };
    updated.projectedExpenses[categoryIndex].items = [
      ...updated.projectedExpenses[categoryIndex].items,
      { ...newItem },
    ];
    updated.actualExpenses[categoryIndex].items = [
      ...updated.actualExpenses[categoryIndex].items,
      { ...newItem },
    ];
    const calculated = calculateTotals(updated);
    setCurrentBudget(calculated);
    onBudgetChange(calculated);
    setNewSubcategoryNames(prev => ({ ...prev, [categoryIndex]: '' }));
    showToast(`Successfully added new subcategory titled: "${name}"`, 'success');
    void saveCurrentBudget(calculated);
  };

  const actuallyRemoveCategory = (categoryIndex: number) => {
    const catName = currentBudget.projectedExpenses[categoryIndex]?.name || '';
    const updated: MonthlyBudgetModel = {
      ...currentBudget,
      projectedExpenses: currentBudget.projectedExpenses.filter((_, i) => i !== categoryIndex),
      actualExpenses: currentBudget.actualExpenses.filter((_, i) => i !== categoryIndex),
    };
    const calculated = calculateTotals(updated);
    setCurrentBudget(calculated);
    onBudgetChange(calculated);
    showToast(`Removed category "${catName}"`, 'info');
    void saveCurrentBudget(calculated);
  };

  const actuallyRemoveSubcategory = (categoryIndex: number, itemIndex: number) => {
    const subName = currentBudget.projectedExpenses[categoryIndex]?.items[itemIndex]?.subCategory || '';
    const updated = { ...currentBudget } as MonthlyBudgetModel;
    updated.projectedExpenses[categoryIndex].items = updated.projectedExpenses[categoryIndex].items.filter((_, i) => i !== itemIndex);
    updated.actualExpenses[categoryIndex].items = updated.actualExpenses[categoryIndex].items.filter((_, i) => i !== itemIndex);
    const calculated = calculateTotals(updated);
    setCurrentBudget(calculated);
    onBudgetChange(calculated);
    showToast(`Removed subcategory "${subName}"`, 'info');
    void saveCurrentBudget(calculated);
  };

  const promptRemoveCategory = (categoryIndex: number) => {
    const label = currentBudget.projectedExpenses[categoryIndex]?.name || 'this category';
    setConfirmTarget({ type: 'category', categoryIndex, label });
    setConfirmOpen(true);
  };

  const promptRemoveSubcategory = (categoryIndex: number, itemIndex: number) => {
    const label = currentBudget.projectedExpenses[categoryIndex]?.items[itemIndex]?.subCategory || 'this subcategory';
    setConfirmTarget({ type: 'subcategory', categoryIndex, itemIndex, label });
    setConfirmOpen(true);
  };

  const promptRemoveTransaction = (categoryIndex: number, itemIndex: number, transactionId: string, transactionDescription: string) => {
    setConfirmTarget({ type: 'transaction', categoryIndex, itemIndex, transactionId, label: transactionDescription });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === 'category' && typeof confirmTarget.categoryIndex === 'number') {
      actuallyRemoveCategory(confirmTarget.categoryIndex);
    } else if (confirmTarget.type === 'subcategory' && typeof confirmTarget.categoryIndex === 'number' && typeof confirmTarget.itemIndex === 'number') {
      actuallyRemoveSubcategory(confirmTarget.categoryIndex, confirmTarget.itemIndex);
    } else if (confirmTarget.type === 'template' && confirmTarget.templateId) {
      void deleteTemplate(confirmTarget.templateId, confirmTarget.label);
    } else if (confirmTarget.type === 'transaction' && typeof confirmTarget.categoryIndex === 'number' && typeof confirmTarget.itemIndex === 'number' && confirmTarget.transactionId) {
      deleteTransactionFromItem(confirmTarget.categoryIndex, confirmTarget.itemIndex, confirmTarget.transactionId);
      showToast(`Removed transaction "${confirmTarget.label}"`, 'info');
    }
    setConfirmOpen(false);
    setConfirmTarget(null);
  };
  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const handleUnsavedChangesPrompt = (action: () => void) => {
    if (!isDirty) {
      action();
      return;
    }
    setPendingAction(() => action);
    setUnsavedChangesOpen(true);
  };

  const handleDiscardChanges = () => {
    if (pendingAction) {
      pendingAction();
    }
    setUnsavedChangesOpen(false);
    setPendingAction(null);
    setIsDirty(false);
  };

  const handleCancelUnsaved = () => {
    setUnsavedChangesOpen(false);
    setPendingAction(null);
  };

  const handleSaveAndContinue = async () => {
    try {
      await saveBudget();
    } finally {
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      setUnsavedChangesOpen(false);
    }
  };

  const saveTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) return;
    
    const exists = templates.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast(`Template "${name}" already exists`, 'error');
      return;
    }

    try {
      const template: BudgetTemplate = {
        id: '',
        name,
        description: newTemplateDescription.trim() || undefined,
        projectedIncome: {
          regular: currentBudget.projectedIncome.regular,
          extra: currentBudget.projectedIncome.extra,
          total: currentBudget.projectedIncome.regular + currentBudget.projectedIncome.extra,
        },
        expenseCategories: currentBudget.projectedExpenses.map(cat => ({
          name: cat.name,
          items: cat.items.map(item => ({
            subCategory: item.subCategory,
            projectedCost: item.projectedCost,
            actualCost: 0,
            difference: 0
          })),
          subtotal: { projected: 0, actual: 0, difference: 0 }
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response = await budgetAPI.saveTemplate(template);
      setTemplates(prev => [...prev, response.data]);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowTemplateDialog(false);
      showToast(`Template "${name}" saved successfully`, 'success');
    } catch (e) {
      showToast('Failed to save template', 'error');
    }
  };

  const applyTemplate = async (template: BudgetTemplate) => {
    try {
      const updated = { ...currentBudget } as MonthlyBudgetModel;
      // Apply projected income from template
      updated.projectedIncome = {
        regular: template.projectedIncome?.regular ?? 0,
        extra: template.projectedIncome?.extra ?? 0,
        total: (template.projectedIncome?.regular ?? 0) + (template.projectedIncome?.extra ?? 0),
      };

      updated.projectedExpenses = template.expenseCategories.map(cat => ({
        name: cat.name,
        items: cat.items.map(item => ({
          subCategory: item.subCategory,
          projectedCost: item.projectedCost,
          actualCost: 0,
          difference: 0
        })),
        subtotal: { projected: 0, actual: 0, difference: 0 }
      }));
      updated.actualExpenses = updated.projectedExpenses.map(cat => ({ ...cat }));

      const calculated = calculateTotals(updated);
      setCurrentBudget(calculated);
      onBudgetChange(calculated);
      setShowApplyTemplateDialog(false);
      showToast(`Applied template "${template.name}"`, 'success');
      void saveCurrentBudget(calculated);
    } catch (e) {
      showToast('Failed to apply template', 'error');
    }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    try {
      await budgetAPI.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      showToast(`Template "${templateName}" deleted`, 'info');
    } catch (e) {
      showToast((e as Error).message || 'Failed to delete template', 'error');
    }
  };

  const saveBudget = async () => {
    setLoading(true);
    try {
      const response = await budgetAPI.saveMonthlyBudget(currentBudget);
      setCurrentBudget(response.data);
      onBudgetChange(response.data);
      setIsDirty(false);
      showToast('Budget saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving budget:', error);
      showToast('Error saving budget', 'error');
    }
    setLoading(false);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Personal Monthly Budget
      </Typography>

      {/* Month/Year Selection */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={selectedMonth}
            onChange={(e) => handleUnsavedChangesPrompt(() => setSelectedMonth(Number(e.target.value)))}
            label="Month"
          >
            {months.map((month, index) => (
              <MenuItem key={index} value={index + 1}>
                {month}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => handleUnsavedChangesPrompt(() => setSelectedYear(Number(e.target.value)))}
            label="Year"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(selectedMonth !== new Date().getMonth() + 1 || selectedYear !== new Date().getFullYear()) && (
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => {
              const currentDate = new Date();
              handleUnsavedChangesPrompt(() => {
                setSelectedMonth(currentDate.getMonth() + 1);
                setSelectedYear(currentDate.getFullYear());
              });
            }}
            title="Jump to current month"
          >
            Current Month
          </Button>
        )}
        
        <Button variant="contained" onClick={saveBudget} disabled={loading || !isDirty}>
          {isDirty ? 'Save Budget' : 'Budget Saved!'}
        </Button>
        
        <Button variant="outlined" onClick={() => setShowTemplateDialog(true)}>
          Save Monthly Template
        </Button>
        
        <Button variant="outlined" onClick={() => setShowApplyTemplateDialog(true)} disabled={templates.length === 0}>
          Manage Monthly Templates
        </Button>
      </Box>

      

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Projected Balance
              </Typography>
              <Typography variant="h4" sx={{ 
                color: currentBudget.projectedBalance > 0 ? 'green' : 
                       currentBudget.projectedBalance < 0 ? 'red' : 'black' 
              }}>
                {formatCurrency(currentBudget.projectedBalance)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Income: {formatCurrency(currentBudget.projectedIncome.total)}
              </Typography>
              <Typography variant="body2">
                Expenses: {formatCurrency(currentBudget.totalProjectedCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="secondary">
                Actual Balance
              </Typography>
              <Typography variant="h4" sx={{ 
                color: currentBudget.actualBalance > 0 ? 'green' : 
                       currentBudget.actualBalance < 0 ? 'red' : 'black' 
              }}>
                {formatCurrency(currentBudget.actualBalance)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Income: {formatCurrency(currentBudget.actualIncome.total)}
              </Typography>
              <Typography variant="body2">
                Expenses: {formatCurrency(currentBudget.totalActualCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ 
                color: 'black' 
              }}>
                Difference
              </Typography>
              <Typography variant="h4" sx={{ 
                color: currentBudget.difference > 0 ? 'green' : 
                       currentBudget.difference < 0 ? 'red' : 'black' 
              }}>
                {formatCurrency(currentBudget.difference)}
              </Typography>
              <Typography variant="body2" sx={{ 
                mt: 1, 
                color: (currentBudget.actualIncome.total - currentBudget.projectedIncome.total) > 0 ? 'green' : 
                       (currentBudget.actualIncome.total - currentBudget.projectedIncome.total) < 0 ? 'red' : 'black' 
              }}>
                Income Diff: {formatCurrency(currentBudget.actualIncome.total - currentBudget.projectedIncome.total)}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: (currentBudget.totalActualCost - currentBudget.totalProjectedCost) > 0 ? 'red' : 
                       (currentBudget.totalActualCost - currentBudget.totalProjectedCost) < 0 ? 'green' : 'black' 
              }}>
                Expense Diff: {formatCurrency(currentBudget.totalActualCost - currentBudget.totalProjectedCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Income Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Projected Monthly Income
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Income"
                  value={editingIncomeValues['income-projected-regular'] ?? String(currentBudget.projectedIncome.regular)}
                  onChange={(e) => handleIncomeInputChange('projected', 'regular', e.target.value)}
                  onFocus={() => {
                    const key = 'income-projected-regular';
                    if ((editingIncomeValues[key] ?? String(currentBudget.projectedIncome.regular)) === '0') {
                      setEditingIncomeValues(prev => ({ ...prev, [key]: '' }));
                    }
                  }}
                  onBlur={() => handleIncomeInputBlur('projected', 'regular')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Extra income"
                  value={editingIncomeValues['income-projected-extra'] ?? String(currentBudget.projectedIncome.extra)}
                  onChange={(e) => handleIncomeInputChange('projected', 'extra', e.target.value)}
                  onFocus={() => {
                    const key = 'income-projected-extra';
                    if ((editingIncomeValues[key] ?? String(currentBudget.projectedIncome.extra)) === '0') {
                      setEditingIncomeValues(prev => ({ ...prev, [key]: '' }));
                    }
                  }}
                  onBlur={() => handleIncomeInputBlur('projected', 'extra')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">
                  Total monthly income: {formatCurrency(currentBudget.projectedIncome.total)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Actual Monthly Income
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Income"
                  value={editingIncomeValues['income-actual-regular'] ?? String(currentBudget.actualIncome.regular)}
                  onChange={(e) => handleIncomeInputChange('actual', 'regular', e.target.value)}
                  onFocus={() => {
                    const key = 'income-actual-regular';
                    if ((editingIncomeValues[key] ?? String(currentBudget.actualIncome.regular)) === '0') {
                      setEditingIncomeValues(prev => ({ ...prev, [key]: '' }));
                    }
                  }}
                  onBlur={() => handleIncomeInputBlur('actual', 'regular')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Extra income"
                  value={editingIncomeValues['income-actual-extra'] ?? String(currentBudget.actualIncome.extra)}
                  onChange={(e) => handleIncomeInputChange('actual', 'extra', e.target.value)}
                  onFocus={() => {
                    const key = 'income-actual-extra';
                    if ((editingIncomeValues[key] ?? String(currentBudget.actualIncome.extra)) === '0') {
                      setEditingIncomeValues(prev => ({ ...prev, [key]: '' }));
                    }
                  }}
                  onBlur={() => handleIncomeInputBlur('actual', 'extra')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">
                  Total monthly income: {formatCurrency(currentBudget.actualIncome.total)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Expense Categories */}
      {currentBudget.projectedExpenses.map((projCategory, categoryIndex) => {
        const actualCategory = currentBudget.actualExpenses[categoryIndex];
        return (
        <Paper key={projCategory.name} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" gutterBottom>
              {projCategory.name}
            </Typography>
            <IconButton aria-label="remove category" onClick={() => promptRemoveCategory(categoryIndex)}>
              <DeleteIcon />
            </IconButton>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Sub Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Projected Cost</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual Cost</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Difference</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projCategory.items.map((item, itemIndex) => {
                  const projectedKey = `projected-${categoryIndex}-${itemIndex}-projectedCost`;
                  const projectedValue = editingValues[projectedKey] ?? String(item.projectedCost);
                  const actualItem = actualCategory.items[itemIndex];
                  const transactionTotal = actualItem?.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
                  const effectiveActualCost = Math.max(actualItem?.actualCost ?? 0, transactionTotal);
                  const transactionKey = `actual-${categoryIndex}-${itemIndex}`;
                  const isExpanded = expandedTransactions[transactionKey];
                  
                  return (
                    <React.Fragment key={itemIndex}>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {item.subCategory}
                            {actualItem?.transactions && actualItem.transactions.length > 0 && (
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                                ({actualItem.transactions.length} transaction{actualItem.transactions.length !== 1 ? 's' : ''})
                              </Typography>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={projectedValue}
                            onChange={(e) => handleNumberInputChange('projected', categoryIndex, itemIndex, 'projectedCost', e.target.value)}
                            onFocus={() => {
                              const key = `projected-${categoryIndex}-${itemIndex}-projectedCost`;
                              if ((editingValues[key] ?? String(item.projectedCost)) === '0') {
                                setEditingValues(prev => ({ ...prev, [key]: '' }));
                              }
                            }}
                            onBlur={() => handleNumberInputBlur('projected', categoryIndex, itemIndex, 'projectedCost')}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'normal',
                                color: 'text.primary',
                                minWidth: '100px',
                                textAlign: 'right'
                              }}
                            >
                              {formatCurrency(effectiveActualCost)}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => toggleTransactionExpansion(categoryIndex, itemIndex, 'actual')}
                              title="View transaction history"
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(effectiveActualCost - item.projectedCost)}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton aria-label="remove subcategory" onClick={() => promptRemoveSubcategory(categoryIndex, itemIndex)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      
                      
                      {/* Transaction History - Show when expanded */}
                      {isExpanded && (
                        <>
                          {/* Transaction History Header */}
                          <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                            <TableCell sx={{ pl: 8, fontSize: '0.875rem', fontWeight: 'bold', color: 'primary.main' }}>
                              Transaction History
                            </TableCell>
                            <TableCell />
                            <TableCell align="right" sx={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'primary.main' }}>
                              Amount
                            </TableCell>
                            <TableCell />
                            <TableCell />
                          </TableRow>
                          
                          {/* Existing transactions */}
                          {actualItem?.transactions && actualItem.transactions.length > 0 ? (
                            actualItem.transactions
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort newest first
                              .map((transaction) => (
                                <TableRow key={transaction.id} sx={{ backgroundColor: '#f9f9f9' }}>
                                  <TableCell sx={{ pl: 12, fontSize: '0.875rem' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                          {transaction.description}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          {new Date(transaction.date).toLocaleDateString('en-US', { 
                                            weekday: 'short', 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}
                                        </Typography>
                                      </Box>
                                      <IconButton 
                                        size="small" 
                                        onClick={() => promptRemoveTransaction(categoryIndex, itemIndex, transaction.id, transaction.description)}
                                        sx={{ color: '#757575' }}
                                        title="Delete transaction"
                                      >
                                        <DeleteIcon fontSize="small" sx={{ fontSize: '0.875rem' }} />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                  <TableCell />
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      {formatCurrency(transaction.amount)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell />
                                  <TableCell />
                                </TableRow>
                              ))
                          ) : (
                            <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                              <TableCell sx={{ pl: 12, fontSize: '0.875rem', color: 'text.secondary' }}>
                                No transactions recorded yet.
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                            </TableRow>
                          )}
                          
                          {/* Add Transaction Form */}
                          <TableRow sx={{ backgroundColor: '#e8f5e8' }}>
                            <TableCell sx={{ pl: 12 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
                                  Add New Transaction:
                                </Typography>
                                <TextField
                                  placeholder="Description"
                                  value={newTransaction.description}
                                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                  size="small"
                                  sx={{ width: 140 }}
                                />
                                <TextField
                                  type="date"
                                  value={newTransaction.date}
                                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell />
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                  placeholder="Amount"
                                  type="number"
                                  value={newTransaction.amount}
                                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                                  size="small"
                                  sx={{ 
                                    width: 100,
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
                                    min: '0', 
                                    step: '0.01',
                                    style: { MozAppearance: 'textfield' }
                                  }}
                                />
                                <Button 
                                  size="small" 
                                  variant="contained"
                                  onClick={() => addTransaction(categoryIndex, itemIndex, 'actual')}
                                  disabled={!newTransaction.description.trim() || !newTransaction.amount || parseFloat(newTransaction.amount) <= 0}
                                  sx={{ minWidth: '60px', fontSize: '0.75rem' }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </TableCell>
                            <TableCell />
                            <TableCell />
                          </TableRow>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
                <TableRow>
                  <TableCell><strong>Subtotal ({projCategory.name})</strong></TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(projCategory.subtotal.projected)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(actualCategory.subtotal.actual)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong style={{ color: (actualCategory.subtotal.actual - projCategory.subtotal.projected) > 0 ? 'red' : 'green' }}>
                      {formatCurrency(actualCategory.subtotal.actual - projCategory.subtotal.projected)}
                    </strong>
                  </TableCell>
                  <TableCell />
                </TableRow>

                {/* Add Subcategory row */}
                <TableRow>
                  <TableCell>
                    <TextField
                      placeholder="New subcategory name"
                      size="small"
                      value={newSubcategoryNames[categoryIndex] || ''}
                      onChange={(e) => setNewSubcategoryNames(prev => ({ ...prev, [categoryIndex]: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell align="right" colSpan={2}>
                    <Button size="small" variant="outlined" onClick={() => addSubcategory(categoryIndex)} disabled={!((newSubcategoryNames[categoryIndex] || '').trim())}>Add subcategory</Button>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );})}

      

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)}>
        <DialogTitle>Save Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Save your current expense categories and projected costs as a template for future months.
          </Typography>
          <TextField
            label="Template Name"
            fullWidth
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            rows={2}
            value={newTemplateDescription}
            onChange={(e) => setNewTemplateDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          <Button onClick={saveTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
        </DialogActions>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={showApplyTemplateDialog} onClose={() => setShowApplyTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose a template to apply to this month. This will replace your current expense categories.
          </Typography>
          {templates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No templates saved yet.
            </Typography>
          ) : (
            <List>
              {templates.map((template) => (
                <ListItem 
                  key={template.id} 
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <ListItemText
                    primary={template.name}
                    secondary={template.description || 'No description'}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button size="small" onClick={() => applyTemplate(template)}>Apply</Button>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setConfirmTarget({ type: 'template', templateId: template.id, label: template.name });
                        setConfirmOpen(true);
                      }}
                      aria-label="delete template"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApplyTemplateDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete {confirmTarget?.type === 'category' ? 'category' : confirmTarget?.type === 'subcategory' ? 'subcategory' : confirmTarget?.type === 'transaction' ? 'transaction' : 'item'} "{confirmTarget?.label}"?
          </Typography>
        </DialogContent>
        <DialogActions>


          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={unsavedChangesOpen} onClose={handleCancelUnsaved}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You have unsaved changes to your budget. What would you like to do?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUnsaved}>Cancel</Button>
          <Button onClick={handleDiscardChanges} color="warning">Discard Changes</Button>
          <Button variant="contained" onClick={handleSaveAndContinue}>
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category (moved to bottom) */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Add Category</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              label="New category name"
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={addCategory} disabled={!newCategoryName.trim()}>Add</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Scroll to Top Button */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          aria-label="scroll back to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default MonthlyBudget;