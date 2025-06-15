import React, { useState, useEffect } from "react";
import { Box, TextField, Typography, Divider, InputAdornment, Link } from "@mui/material";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import AuthService from "../../services/AuthService";
import useAuth from "../../hooks/useAuth";
import FormContainer from "../../components/common/FormContainer";
import AppButton from "../../components/common/AppButton";
import { handleError } from "../../lib/ErrorHandler";

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
    
    if (isSigningIn) return;
    
    try {
      setIsSigningIn(true);
      setErrorMessage("");
      
      await AuthService.doSignInWithEmailAndPassword(email, password);
      navigate(from, { replace: true });
      
    } catch (error: any) {
      handleError(error, 'Login failed');
      
      const errorMsg = 
        error.code === 'auth/user-not-found' ? "User not found. Please check your email." : 
        error.code === 'auth/wrong-password' ? "Invalid password. Please try again." : 
        error.code === 'auth/invalid-email' ? "Please enter a valid email address." :
        error.code === 'auth/user-disabled' ? "This account has been disabled." :
        error.code === 'auth/too-many-requests' ? "Too many failed attempts. Please try again later." :
        "Sign in failed. Please try again.";
      
      setErrorMessage(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSigningIn) return;
    
    try {
      setIsSigningIn(true);
      setErrorMessage("");
      
      await AuthService.doSignInWithGoogle();
      navigate(from, { replace: true });
      
    } catch (error: any) {
      handleError(error, 'Google sign in failed');
      
      const errorMsg = 
        error.code === 'auth/popup-closed-by-user' ? "Sign in was cancelled." :
        error.code === 'auth/popup-blocked' ? "Please allow popups for this site." :
        error.code === 'auth/account-exists-with-different-credential' ? "An account already exists with this email." :
        "Google sign in failed. Please try again.";
      
      setErrorMessage(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <FormContainer title="Sign in to your account" errorMessage={errorMessage}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
          fullWidth
          disabled={isSigningIn}
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
          disabled={isSigningIn}
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