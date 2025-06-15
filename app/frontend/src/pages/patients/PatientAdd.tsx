import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Paper } from '@mui/material';
import { addPatient } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import PatientForm from '../../components/patient/PatientForm';
import { handleError } from '../../lib/ErrorHandler';

const PatientAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (patientData: Omit<Patient, 'id'>) => {
    try {
      setLoading(true);
      const patientId = await addPatient(patientData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/patients/${patientId}`);
      }, 1000);
      
    } catch (err) {
      handleError(err, 'Failed to add patient');
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
        />
      </Paper>
    </Box>
  );
};

export default PatientAdd;