import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Paper } from '@mui/material';
import { addPatient } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import PatientForm from '../../components/patient/PatientForm';

const PatientAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (patientData: Omit<Patient, 'id'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const patientId = await addPatient(patientData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/patients/${patientId}`);
      }, 1000);
      
    } catch (err) {
      console.error('Error adding patient:', err);
      setError('Failed to add patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Add New Patient
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Patient added successfully! Redirecting...
          </Alert>
        )}
        
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/patients')}
          submitButtonText="Add Patient"
          loading={loading}
          error={error}
        />
      </Paper>
    </Box>
  );
};

export default PatientAdd;