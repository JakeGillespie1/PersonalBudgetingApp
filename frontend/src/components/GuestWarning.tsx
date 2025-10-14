import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  Alert, 
  AlertTitle, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Typography,
  Box,
  Snackbar
} from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface GuestWarningProps {
  onConvertToAccount?: () => void;
}

const GuestWarning: React.FC<GuestWarningProps> = ({ onConvertToAccount }) => {
  const { isGuest, convertGuestToAccount } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isGuest) {
      // Show warning after 5 minutes of guest usage
      const timer = setTimeout(() => {
        setShowWarning(true);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(timer);
    }
  }, [isGuest]);

  const handleConvertToAccount = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await convertGuestToAccount(email, password);
      setSuccess(true);
      setShowConvertDialog(false);
      onConvertToAccount?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }

    setLoading(false);
  };

  const handleDismissWarning = () => {
    setShowWarning(false);
    // Show warning again after 10 minutes
    setTimeout(() => setShowWarning(true), 10 * 60 * 1000);
  };

  if (!isGuest) return null;

  return (
    <>
      {/* Persistent Guest Warning */}
      <Alert 
        severity="warning" 
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => setShowConvertDialog(true)}>
            Create Account
          </Button>
        }
      >
        <AlertTitle>Guest Mode</AlertTitle>
        You're using the app as a guest. Create an account to save your data permanently.
      </Alert>

      {/* Periodic Warning Dialog */}
      <Dialog open={showWarning} onClose={handleDismissWarning}>
        <DialogTitle>Save Your Work</DialogTitle>
        <DialogContent>
          <Typography>
            You've been using the app as a guest. Your data will be lost when you close the browser 
            unless you create an account to save it permanently.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismissWarning}>Continue as Guest</Button>
          <Button onClick={() => setShowConvertDialog(true)} variant="contained">
            Create Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert to Account Dialog */}
      <Dialog open={showConvertDialog} onClose={() => setShowConvertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Account to Save Your Data</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConvertDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConvertToAccount} 
            variant="contained"
            disabled={loading || !email || !password || !confirmPassword}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        message="Account created successfully! Your data has been saved."
      />
    </>
  );
};

export default GuestWarning;
