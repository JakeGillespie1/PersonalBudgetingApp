import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { Box, Button, Paper, TextField, Typography, Stack } from '@mui/material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e?.message || 'Failed to sign in');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e?.message || 'Failed to register');
    }
    setLoading(false);
  };

  const handleAnon = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (e: any) {
      setError(e?.message || 'Failed to sign in anonymously');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" gutterBottom>Sign in</Typography>
        <Stack spacing={2}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Button variant="contained" onClick={handleLogin} disabled={loading}>Sign in</Button>
          <Button variant="outlined" onClick={handleRegister} disabled={loading}>Create account</Button>
          <Button onClick={handleAnon} disabled={loading}>Continue as guest</Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Login;


