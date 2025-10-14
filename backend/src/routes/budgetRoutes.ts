import express from 'express';
import JSZip from 'jszip';
import { db } from '../config/firebase';
import { MonthlyBudget, YearlySummary } from '../types/budget';
import { verifyFirebaseToken } from '../security/auth';

const router = express.Router();

// Require authentication for all routes below
router.use(verifyFirebaseToken);

// Get all monthly budgets
router.get('/monthly', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const year = req.query.year;
    let snapshot;
    
    if (year) {
      // Get budgets for specific year
      snapshot = await db.collection('users').doc(uid).collection('monthlyBudgets')
        .where('year', '==', parseInt(year as string))
        .orderBy('month')
        .get();
    } else {
      // Get all budgets
      snapshot = await db.collection('users').doc(uid).collection('monthlyBudgets').get();
    }
    
    const budgets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Get monthly budget by year and month
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { year, month } = req.params;
    const snapshot = await db.collection('users').doc(uid).collection('monthlyBudgets')
      .where('year', '==', parseInt(year))
      .where('month', '==', parseInt(month))
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const budget = snapshot.docs[0];
    res.json({ id: budget.id, ...budget.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

// Create or update monthly budget
router.post('/monthly', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const budgetData: MonthlyBudget = req.body;
    budgetData.updatedAt = new Date();
    
    if (budgetData.id) {
      // Update existing budget - do not store id in document
      const { id, ...dataWithoutId } = budgetData;
      await db
        .collection('users')
        .doc(uid)
        .collection('monthlyBudgets')
        .doc(id)
        .update(dataWithoutId as FirebaseFirestore.UpdateData<MonthlyBudget>);
      res.json({ id, ...dataWithoutId });
    } else {
      // Create new budget - do not store id in document
      budgetData.createdAt = new Date();
      const { id: _omit, ...dataWithoutId } = budgetData;
      const docRef = await db
        .collection('users')
        .doc(uid)
        .collection('monthlyBudgets')
        .add(dataWithoutId as MonthlyBudget);
      res.json({ id: docRef.id, ...dataWithoutId });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// Get yearly summary
router.get('/yearly/:year', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { year } = req.params;
    const snapshot = await db.collection('users').doc(uid).collection('yearlySummaries')
      .where('year', '==', parseInt(year))
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Yearly summary not found' });
    }
    
    const summary = snapshot.docs[0];
    res.json({ id: summary.id, ...summary.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch yearly summary' });
  }
});

// Template routes
router.get('/templates', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const snapshot = await db.collection('users').doc(uid).collection('templates').get();
    const templates = snapshot.docs.map(doc => {
      const data = doc.data();
      // Do not allow stored 'id' field to override the Firestore doc id
      if ((data as any).id !== undefined) {
        delete (data as any).id;
      }
      return { ...data, id: doc.id };
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const templateData = req.body;
    templateData.updatedAt = new Date();
    
    if (templateData.id) {
      // Update existing template
      const { id, ...dataWithoutId } = templateData;
      await db.collection('users').doc(uid).collection('templates').doc(id).update(dataWithoutId);
      res.json({ id, ...dataWithoutId });
    } else {
      // Create new template
      templateData.createdAt = new Date();
      // Do not persist an 'id' field inside the document
      const { id: _omit, ...dataWithoutId } = templateData;
      const docRef = await db.collection('users').doc(uid).collection('templates').add(dataWithoutId);
      res.json({ ...dataWithoutId, id: docRef.id });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { id } = req.params;
    await db.collection('users').doc(uid).collection('templates').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Account routes
router.get('/accounts', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    console.log('Fetching accounts for user:', uid);
    const snapshot = await db.collection('users').doc(uid).collection('accounts').get();
    const accounts = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Account ${doc.id}:`, data);
      
      // Convert Firestore timestamps to Date objects
      const processedData = {
        id: doc.id,
        name: data.name,
        monthlyValues: data.monthlyValues || new Array(12).fill(0),
        currentValue: data.currentValue || 0,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
      };
      
      console.log(`Processed account ${doc.id}:`, processedData);
      return processedData;
    });
    console.log('Total accounts found:', accounts.length);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const accountData = req.body;
    accountData.updatedAt = new Date();
    
    if (accountData.id) {
      // Update existing account
      const { id, ...dataWithoutId } = accountData;
      await db.collection('users').doc(uid).collection('accounts').doc(id).update(dataWithoutId);
      res.json({ id, ...dataWithoutId });
    } else {
      // Create new account
      accountData.createdAt = new Date();
      const { id: _omit, ...dataWithoutId } = accountData;
      const docRef = await db.collection('users').doc(uid).collection('accounts').add(dataWithoutId);
      res.json({ ...dataWithoutId, id: docRef.id });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save account' });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { id } = req.params;
    const accountData = req.body;
    console.log(`Updating account ${id} for user ${uid}:`, accountData);
    
    accountData.updatedAt = new Date();
    
    // Do not persist an 'id' field inside the document
    const { id: _omit, ...dataWithoutId } = accountData;
    console.log('Data being updated to Firestore:', dataWithoutId);
    
    await db.collection('users').doc(uid).collection('accounts').doc(id).update(dataWithoutId);
    res.json({ id, ...dataWithoutId });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { id } = req.params;
    await db.collection('users').doc(uid).collection('accounts').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Refresh yearly summary with aggregated data from monthly budgets
router.post('/yearly/:year/refresh', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { year } = req.params;
    
    // Get all monthly budgets for the year
    const monthlyBudgetsSnapshot = await db.collection('users').doc(uid).collection('monthlyBudgets')
      .where('year', '==', parseInt(year))
      .orderBy('month')
      .get();
    
    // Get all accounts for the year
    const accountsSnapshot = await db.collection('users').doc(uid).collection('accounts').get();
    const accounts: any[] = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Initialize arrays for 12 months
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);
    const monthlySavings = new Array(12).fill(0);
    const monthlyNetWorth = new Array(12).fill(0);
    
    // Process monthly budgets
    monthlyBudgetsSnapshot.docs.forEach(doc => {
      const budget = doc.data();
      const monthIndex = budget.month - 1; // Convert to 0-based index
      
      monthlyIncome[monthIndex] = budget.actualIncome.total;
      monthlyExpenses[monthIndex] = budget.totalActualCost;
      monthlySavings[monthIndex] = budget.actualIncome.total - budget.totalActualCost;
    });
    
    // Calculate cumulative net-worth
    let cumulativeSavings = 0;
    for (let i = 0; i < 12; i++) {
      cumulativeSavings += monthlySavings[i];
      const accountValues = accounts.reduce((sum: number, acc: any) => {
        const accountTotal = (acc.monthlyValues || []).slice(0, i + 1).reduce((total: number, val: number) => total + val, 0);
        return sum + accountTotal;
      }, 0);
      monthlyNetWorth[i] = cumulativeSavings + accountValues;
    }
    
    // Calculate totals and averages
    const yearlyIncomeTotal = monthlyIncome.reduce((sum: number, income: number) => sum + income, 0);
    const yearlyAverageIncome = yearlyIncomeTotal / 12;
    const yearlyExpensesTotal = monthlyExpenses.reduce((sum: number, expense: number) => sum + expense, 0);
    const yearlyAverageExpense = yearlyExpensesTotal / 12;
    const yearlySavingsTotal = monthlySavings.reduce((sum: number, saving: number) => sum + saving, 0);
    const yearlyAverageSavings = yearlySavingsTotal / 12;
    const yearlyHigh = Math.max(...monthlyNetWorth);
    
    const netWorthSummary = {
      monthlyNetWorth,
      yearlyHigh,
      yearlyTotal: yearlySavingsTotal
    };
    
    const yearlySummaryData = {
      year: parseInt(year),
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
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
    
    // Save or update yearly summary
    const existingSnapshot = await db.collection('users').doc(uid).collection('yearlySummaries')
      .where('year', '==', parseInt(year))
      .get();
    
    if (!existingSnapshot.empty) {
      const docId = existingSnapshot.docs[0].id;
      await db.collection('users').doc(uid).collection('yearlySummaries').doc(docId).update(yearlySummaryData);
      res.json({ id: docId, ...yearlySummaryData });
    } else {
      const docRef = await db.collection('users').doc(uid).collection('yearlySummaries').add(yearlySummaryData);
      res.json({ id: docRef.id, ...yearlySummaryData });
    }
  } catch (error) {
    console.error('Error refreshing yearly summary:', error);
    res.status(500).json({ error: 'Failed to refresh yearly summary' });
  }
});

// Export yearly data to CSV files
router.get('/yearly/:year/export', async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;
    const { year } = req.params;
    const yearNum = parseInt(year);

    // Get all monthly budgets for the year
    const monthlyBudgetsSnapshot = await db.collection('users').doc(uid).collection('monthlyBudgets')
      .where('year', '==', yearNum)
      .orderBy('month')
      .get();

    // Get all accounts for the year
    const accountsSnapshot = await db.collection('users').doc(uid).collection('accounts').get();
    const accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    const monthlyBudgets = monthlyBudgetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Generate dimension data
    const dimDates: any[] = [];
    const dimParentSections: any[] = [];
    const dimSubSections: any[] = [];
    const dimIncomeTypes: any[] = [];
    const fctAccountTotals: any[] = [];
    const fctMonthlyIncomes: any[] = [];
    const fctBudgetTransactions: any[] = [];

    // DimDates - generate for all months in the year with YY-Mon format
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let month = 1; month <= 12; month++) {
      const yearShort = yearNum.toString().slice(-2); // Get last 2 digits of year
      const monthYearKey = `${yearShort}-${monthNames[month - 1]}`;
      dimDates.push({
        MonthYearKey: monthYearKey
      });
    }

    // Collect unique parent sections, sub-sections, and income types
    const uniqueParentSections = new Map();
    const uniqueSubSections = new Map();
    const uniqueIncomeTypes = new Map();

    // DimIncomeTypes - simplified to just actual vs projected (1=Actual, 2=Projected)
    uniqueIncomeTypes.set('actual', { name: 'Actual Income' });
    uniqueIncomeTypes.set('projected', { name: 'Projected Income' });

    // Generate income type IDs first
    let incomeTypeId = 1;
    const incomeTypeMap = new Map();
    Array.from(uniqueIncomeTypes.values()).forEach(incomeType => {
      incomeTypeMap.set(incomeType.name, incomeTypeId);
      dimIncomeTypes.push({
        ID: incomeTypeId++,
        Name: incomeType.name
      });
    });

    // Generate parent section IDs
    let parentSectionId = 1;
    const parentSectionMap = new Map();
    monthlyBudgets.forEach(budget => {
      if (budget.actualExpenses) {
        budget.actualExpenses.forEach((category: any) => {
          if (!uniqueParentSections.has(category.name)) {
            uniqueParentSections.set(category.name, { name: category.name });
            parentSectionMap.set(category.name, parentSectionId++);
          }
        });
      }
      if (budget.projectedExpenses) {
        budget.projectedExpenses.forEach((category: any) => {
          if (!uniqueParentSections.has(category.name)) {
            uniqueParentSections.set(category.name, { name: category.name });
            parentSectionMap.set(category.name, parentSectionId++);
          }
        });
      }
    });

    // Generate sub-section IDs  
    let subSectionId = 1;
    const subSectionMap = new Map();
    monthlyBudgets.forEach(budget => {
      [budget.actualExpenses, budget.projectedExpenses].forEach(expenses => {
        if (expenses) {
          expenses.forEach((category: any) => {
            category.items.forEach((item: any) => {
              const key = `${category.name}-${item.subCategory}`;
              if (!uniqueSubSections.has(key)) {
                uniqueSubSections.set(key, { 
                  name: item.subCategory, 
                  parentName: category.name 
                });
                subSectionMap.set(key, subSectionId++);
              }
            });
          });
        }
      });
    });

    // Process monthly budgets for categories and income
    monthlyBudgets.forEach(budget => {
      const yearShort = budget.year.toString().slice(-2);
      const monthYearKey = `${yearShort}-${monthNames[budget.month - 1]}`;

      // Process actualIncome - create separate transactions for regular and extra
      if (budget.actualIncome) {
        if (budget.actualIncome.regular > 0) {
          fctMonthlyIncomes.push({
            ID: fctMonthlyIncomes.length + 1,
            Name: 'Actual Regular Income',
            Value: budget.actualIncome.regular,
            MonthYear: monthYearKey,
            IncomeTypeID: incomeTypeMap.get('Actual Income') || 1
          });
        }
        if (budget.actualIncome.extra > 0) {
          fctMonthlyIncomes.push({
            ID: fctMonthlyIncomes.length + 1,
            Name: 'Actual Extra Income',
            Value: budget.actualIncome.extra,
            MonthYear: monthYearKey,
            IncomeTypeID: incomeTypeMap.get('Actual Income') || 1
          });
        }
      }

      // Process projectedIncome - create separate transactions for regular and extra
      if (budget.projectedIncome) {
        if (budget.projectedIncome.regular > 0) {
          fctMonthlyIncomes.push({
            ID: fctMonthlyIncomes.length + 1,
            Name: 'Projected Regular Income',
            Value: budget.projectedIncome.regular,
            MonthYear: monthYearKey,
            IncomeTypeID: incomeTypeMap.get('Projected Income') || 2
          });
        }
        if (budget.projectedIncome.extra > 0) {
          fctMonthlyIncomes.push({
            ID: fctMonthlyIncomes.length + 1,
            Name: 'Projected Extra Income',
            Value: budget.projectedIncome.extra,
            MonthYear: monthYearKey,
            IncomeTypeID: incomeTypeMap.get('Projected Income') || 2
          });
        }
      }

      // Process actualExpenses
      if (budget.actualExpenses) {
        budget.actualExpenses.forEach((category: any) => {
          uniqueParentSections.set(category.name, { name: category.name });

          category.items.forEach((item: any) => {
            const subSectionKey = `${category.name}-${item.subCategory}`;
            
            // Get projected values from projected expenses or default to 0
            const projectedCategory = budget.projectedExpenses?.find((pc: any) => pc.name === category.name);
            const projectedItem = projectedCategory?.items.find((pi: any) => pi.subCategory === item.subCategory);
            
            fctBudgetTransactions.push({
              ID: fctBudgetTransactions.length + 1,
              MonthYear: monthYearKey,
              ParentSectionID: parentSectionMap.get(category.name),
              SubSectionID: subSectionMap.get(subSectionKey),
              ProjectedCost: projectedItem?.projectedCost || 0,
              ActualCost: item.actualCost || 0
            });
          });
        });
      }

      // Process projectedExpenses that don't have corresponding actual expenses
      if (budget.projectedExpenses) {
        budget.projectedExpenses.forEach((category: any) => {
          const actualCategory = budget.actualExpenses?.find((ac: any) => ac.name === category.name);
          
          category.items.forEach((item: any) => {
            const actualItem = actualCategory?.items.find((ai: any) => ai.subCategory === item.subCategory);
            
            // Only add if there's no corresponding actual item
            if (!actualItem) {
              const subSectionKey = `${category.name}-${item.subCategory}`;

              fctBudgetTransactions.push({
                ID: fctBudgetTransactions.length + 1,
                MonthYear: monthYearKey,
                ParentSectionID: parentSectionMap.get(category.name),
                SubSectionID: subSectionMap.get(subSectionKey),
                ProjectedCost: item.projectedCost || 0,
                ActualCost: 0
              });
            }
          });
        });
      }
    });

    // Generate dimension records from collected data
    dimParentSections.push(...Array.from(uniqueParentSections.entries()).map(([name, section]) => ({
      ID: parentSectionMap.get(name),
      Name: section.name
    })));

    dimSubSections.push(...Array.from(uniqueSubSections.entries()).map(([key, subSection]) => ({
      ID: subSectionMap.get(key),
      Name: subSection.name,
      ParentSectionID: parentSectionMap.get(subSection.parentName)
    })));

    // Generate account totals data
    accounts.forEach((account, accountIndex) => {
      for (let month = 1; month <= 12; month++) {
        const yearShort = yearNum.toString().slice(-2);
        const monthYearKey = `${yearShort}-${monthNames[month - 1]}`;
        const value = account.monthlyValues?.[month - 1] || 0;
        
        fctAccountTotals.push({
          ID: fctAccountTotals.length + 1,
          Name: account.name,
          MonthYear: monthYearKey,
          ActualValue: value
        });
      }
    });

    // Generate CSV files content
    const csvFiles = {
      'DimDates.csv': convertToCSV(dimDates, ['MonthYearKey']),
      'DimParentSections.csv': convertToCSV(dimParentSections, ['ID', 'Name']),
      'DimSubSections.csv': convertToCSV(dimSubSections, ['ID', 'Name', 'ParentSectionID']),
      'DimIncomeTypes.csv': convertToCSV(dimIncomeTypes, ['ID', 'Name']),
      'FctAccountTotals.csv': convertToCSV(fctAccountTotals, ['ID', 'Name', 'MonthYear', 'ActualValue']),
      'FctMonthlyIncomes.csv': convertToCSV(fctMonthlyIncomes, ['ID', 'Name', 'Value', 'MonthYear', 'IncomeTypeID']),
      'FctBudgetTransactions.csv': convertToCSV(fctBudgetTransactions, ['ID', 'MonthYear', 'ParentSectionID', 'SubSectionID', 'ProjectedCost', 'ActualCost'])
    };

    // Create ZIP file
    const zip = new JSZip();
    Object.entries(csvFiles).forEach(([filename, csvContent]) => {
      zip.file(filename, csvContent);
    });

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = `ExportedFinancialData${yearNum}.zip`;

    // Return ZIP file
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFilename}"`,
      'Content-Length': zipBuffer.length.toString()
    });
    res.send(zipBuffer);

  } catch (error) {
    console.error('Error exporting yearly data:', error);
    res.status(500).json({ error: 'Failed to export yearly data' });
  }
});

// Utility function to convert JSON to CSV
const convertToCSV = (data: any[], headers: string[]): string => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }
  
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

export default router;