import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Patient } from '../../types/Patient';
import AppButton from '../common/AppButton';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

interface PatientFormProps {
  initialData?: Patient;
  onSubmit: (patient: Omit<Patient, 'id'>) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  loading?: boolean;
  error?: string | null;
}

const PatientForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = 'Save',
  loading = false,
  error = null,
}: PatientFormProps) => {
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(initialData?.dateOfBirth || null);
  const [address, setAddress] = useState(initialData?.address || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName || '');
      setLastName(initialData.lastName || '');
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setDateOfBirth(initialData.dateOfBirth || null);
      setAddress(initialData.address || '');
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const validateForm = () => {
    let isValid = true;
    
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPhoneError('');
    
    if (!firstName.trim()) {
      setFirstNameError('First name is required');
      isValid = false;
    }
    
    if (!lastName.trim()) {
      setLastNameError('Last name is required');
      isValid = false;
    }
    
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    if (phoneNumber && !PHONE_REGEX.test(phoneNumber)) {
      setPhoneError('Please enter a valid phone number');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const patientData: Omit<Patient, 'id'> = {
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth: dateOfBirth || undefined,
      address,
      notes
    };
    
    await onSubmit(patientData);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              required
              error={!!firstNameError}
              helperText={firstNameError}
              disabled={loading}
              size="medium"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              required
              error={!!lastNameError}
              helperText={lastNameError}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              error={!!emailError}
              helperText={emailError}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              fullWidth
              error={!!phoneError}
              helperText={phoneError || 'Format: +1234567890'}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Date of Birth"
              value={dateOfBirth}
              onChange={(date) => setDateOfBirth(date)}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined'
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <AppButton 
                variant="outlined" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </AppButton>
              <AppButton 
                type="submit" 
                variant="contained" 
                color="primary"
                loading={loading}
                disabled={!firstName.trim() || !lastName.trim()}
              >
                {submitButtonText}
              </AppButton>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default PatientForm;