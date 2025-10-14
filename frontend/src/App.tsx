import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Tabs, Tab, Box, Button } from '@mui/material';
import MonthlyBudget from './components/MonthlyBudget';
import YearlySummary from './components/YearlySummary';
import Login from './components/Login';
import GuestWarning from './components/GuestWarning';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { MonthlyBudget as MonthlyBudgetType } from './types/budget';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function AppContent() {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentBudget, setCurrentBudget] = useState<MonthlyBudgetType | null>(null);
  const { user, loading, signOut, isGuest } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return <Box sx={{ p: 4 }}>Loading...</Box>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Personal Budgeting App
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {isGuest ? 'Guest User' : (user.email || 'User')}
          </Typography>
          <Button color="inherit" onClick={signOut}>
            {isGuest ? 'Exit Guest Mode' : 'Sign out'}
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <GuestWarning />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="budget tabs">
            <Tab label="Monthly Budget" />
            <Tab label="Yearly Summary" />
          </Tabs>
        </Box>
        
        <TabPanel value={currentTab} index={0}>
          <MonthlyBudget 
            budget={currentBudget}
            onBudgetChange={setCurrentBudget}
          />
        </TabPanel>
        
        <TabPanel value={currentTab} index={1}>
          <YearlySummary />
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;