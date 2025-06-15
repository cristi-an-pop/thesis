import React, { useState, useEffect } from "react";
import { Box, TextField, Typography, InputAdornment, Link, FormControlLabel, Checkbox, Divider } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AuthService from "../../services/AuthService";
import FormContainer from "../../components/common/FormContainer";
import AppButton from "../../components/common/AppButton";
import { handleError } from "../../lib/ErrorHandler";

import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

const Register = () => {
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [validPassword, setValidPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validMatch, setValidMatch] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setValidEmail(EMAIL_REGEX.test(email));
  }, [email]);

  useEffect(() => {
    setValidPassword(PASSWORD_REGEX.test(password));
    setValidMatch(password === confirmPassword && confirmPassword.length > 0);
  }, [password, confirmPassword]);

  useEffect(() => {
    setErrorMessage("");
  }, [email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistering) return;
    
    // Validation
    if (!validEmail) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    if (!validPassword) {
      setErrorMessage("Password must meet requirements");
      return;
    }
    
    if (!validMatch) {
      setErrorMessage("Passwords must match");
      return;
    }
    
    try {
      setIsRegistering(true);
      setErrorMessage("");
      
      const role = isAdmin ? "admin" : "user";
      await AuthService.doCreateUserWithEmailAndPassword(email, password, role);
      
      setSuccess(true);
      
    } catch (error: any) {
      handleError(error, 'Registration failed');
      
      const errorMsg = 
        error.code === 'auth/email-already-in-use' ? "This email is already registered. Please sign in or use a different email." :
        error.code === 'auth/weak-password' ? "Password is too weak. Please choose a stronger password." :
        error.code === 'auth/invalid-email' ? "Please enter a valid email address." :
        error.code === 'auth/operation-not-allowed' ? "Email/password accounts are not enabled. Please contact support." :
        error.code === 'auth/too-many-requests' ? "Too many attempts. Please try again later." :
        "Registration failed. Please try again.";
      
      setErrorMessage(errorMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  if (success) {
    return (
      <FormContainer title="Registration Successful">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Your account has been created successfully!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" gutterBottom>
              You can now sign in with your credentials.
            </Typography>
          </Box>

        <Box sx={{ textAlign: "center" }}>
          <Link 
            component={RouterLink} 
            to="/login" 
            color="primary"
            underline="hover"
          >
            Already have an account? Sign in
          </Link>
        </Box>
        </Box>
      </FormContainer>
    );
  }

  return (
    <FormContainer title="Create an account" errorMessage={errorMessage}>
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
          disabled={isRegistering}
          error={email.length > 0 && !validEmail}
          helperText={
            email.length > 0 && !validEmail
              ? "Please enter a valid email address"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon 
                  color={validEmail && email.length > 0 ? "success" : "primary"} 
                />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
          fullWidth
          disabled={isRegistering}
          error={password.length > 0 && !validPassword}
          helperText={
            password.length > 0 && !validPassword
              ? "8-24 characters, must include: uppercase, lowercase, number, and special character (!@#$%)"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon 
                  color={validPassword && password.length > 0 ? "success" : "primary"} 
                />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          value={confirmPassword}
          required
          fullWidth
          disabled={isRegistering}
          error={confirmPassword.length > 0 && !validMatch}
          helperText={
            confirmPassword.length > 0 && !validMatch
              ? "Passwords must match"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon 
                  color={validMatch && confirmPassword.length > 0 ? "success" : "primary"} 
                />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControlLabel
          control={
            <Checkbox
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              color="primary"
              disabled={isRegistering}
            />
          }
          label={
            <Typography variant="body2">
              Register as administrator
            </Typography>
          }
        />
        
        <AppButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={!validEmail || !validPassword || !validMatch}
          loading={isRegistering}
          startIcon={<PersonAddIcon />}
          fullWidth
          sx={{ mt: 1 }}
        >
          Create Account
        </AppButton>
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ textAlign: "center" }}>
          <Link 
            component={RouterLink} 
            to="/login" 
            color="primary"
            underline="hover"
          >
            Already have an account? Sign in
          </Link>
        </Box>
      </Box>
    </FormContainer>
  );
};

export default Register;