import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Divider,
  InputAdornment,
  Link,
} from "@mui/material";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import AuthService from "../../services/AuthService";
import useAuth from "../../hooks/useAuth";
import FormContainer from "../../components/common/FormContainer";
import AppButton from "../../components/common/AppButton";

import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import GoogleIcon from "@mui/icons-material/Google";

const Login = () => {
  const { currentUser } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setErrorMessage("");
  }, [email, password]);

  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isSigningIn) {
        setIsSigningIn(true);
        await AuthService.doSignInWithEmailAndPassword(email, password);
        setIsSigningIn(false);
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      const errorMsg = error.code === 'auth/user-not-found' ? 
        "User not found. Please check your email." : 
        error.code === 'auth/wrong-password' ? 
        "Invalid password. Please try again." : 
        error.message;
      
      setErrorMessage(errorMsg);
      setIsSigningIn(false);
    }
  }

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isSigningIn) {
        setIsSigningIn(true);
        await AuthService.doSignInWithGoogle();
        setIsSigningIn(false);
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
    }
  }

  return (
    <FormContainer title="Sign in to your account" errorMessage={errorMessage}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <TextField
          label="Email"
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
        
        <AppButton
          type="submit"
          variant="contained"
          color="primary"
          loading={isSigningIn}
          disabled={!email || !password}
          fullWidth
          sx={{ mt: 1 }}
        >
          Sign In
        </AppButton>

        <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
            OR
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>

        <AppButton
          variant="outlined"
          color="primary"
          onClick={handleGoogleSignIn}
          loading={isSigningIn}
          startIcon={<GoogleIcon />}
          fullWidth
        >
          Sign in with Google
        </AppButton>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link 
            component={RouterLink} 
            to="/register" 
            color="primary"
            underline="hover"
          >
            Don't have an account? Register
          </Link>
        </Box>
      </Box>
    </FormContainer>
  );
};

export default Login;