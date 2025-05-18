import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  Link,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AuthService from "../../services/AuthService";
import FormContainer from "../../components/common/FormContainer";
import AppButton from "../../components/common/AppButton";

// Icons
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

  // Validation effects
  useEffect(() => {
    setValidEmail(EMAIL_REGEX.test(email));
  }, [email]);

  useEffect(() => {
    setValidPassword(PASSWORD_REGEX.test(password));
    setValidMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  useEffect(() => {
    setErrorMessage("");
  }, [email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!EMAIL_REGEX.test(email) || !PASSWORD_REGEX.test(password)) {
      setErrorMessage("Invalid Entry");
      return;
    }
    
    try {
      const role = isAdmin ? "admin" : "user";
      if (!isRegistering) {
        setIsRegistering(true);
        await AuthService.doCreateUserWithEmailAndPassword(email, password, role);
        setIsRegistering(false);
        setSuccess(true);
      }
    } catch (error: any) {
      console.error(error);
      
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "This email is already registered. Please sign in or use a different email.";
      }
      
      setIsRegistering(false);
      setErrorMessage(errorMsg);
      setSuccess(false);
    }
  };

  if (success) {
    return (
      <FormContainer title="Registration Successful">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
          
          <Typography variant="h6" align="center" gutterBottom>
            Your account has been created successfully!
          </Typography>
          
          <Typography variant="body1" align="center" gutterBottom>
            You can now sign in with your credentials.
          </Typography>

          <Link component={RouterLink} to="/login" color="primary" underline="hover">
            Sign in to your account
          </Link>
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
          autoComplete="off"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
          fullWidth
          error={email.length > 0 && !validEmail}
          helperText={
            email.length > 0 && !validEmail
              ? "Please enter a valid email address"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color={validEmail && email.length > 0 ? "success" : "primary"} />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
          fullWidth
          error={password.length > 0 && !validPassword}
          helperText={
            password.length > 0 && !validPassword
              ? "8-24 characters, must include: uppercase, lowercase, number, and special character (!@#$%)"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color={validPassword && password.length > 0 ? "success" : "primary"} />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Confirm Password"
          type="password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          value={confirmPassword}
          required
          fullWidth
          error={confirmPassword.length > 0 && !validMatch}
          helperText={
            confirmPassword.length > 0 && !validMatch
              ? "Passwords must match"
              : ""
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color={validMatch && confirmPassword.length > 0 ? "success" : "primary"} />
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
            />
          }
          label={<Typography variant="body2">Register as administrator</Typography>}
        />
        
        <AppButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={!validEmail || !validPassword || !validMatch || isRegistering}
          loading={isRegistering}
          startIcon={<PersonAddIcon />}
          fullWidth
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