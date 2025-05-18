import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Skeleton,
  Grid,
} from '@mui/material';
import { getPatientById, updatePatient } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import PatientForm from '../../components/patient/PatientForm';
import AppButton from '../../components/common/AppButton';

const PatientEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const patientData = await getPatientById(id);
        setPatient(patientData);
        setError(null);
      } catch (err) {
        console.error('Error fetching patient:', err);
        setError('Failed to load patient information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatient();
  }, [id]);
  
  const handleSubmit = async (patientData: Omit<Patient, 'id'>) => {
    if (!id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await updatePatient(id, patientData);
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/patients/${id}`);
      }, 1000);
      
    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Failed to update patient. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" sx={{ fontSize: '2rem', width: '50%', mb: 2 }} />
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="rectangular" height={40} sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="rectangular" height={40} sx={{ mt: 1, mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="rectangular" height={80} sx={{ mt: 1 }} />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }
  
  // Error state
  if (error || !patient) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">
          {error || 'Patient not found'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <AppButton variant="outlined" onClick={() => navigate('/patients')}>
            Back to Patients
          </AppButton>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Edit Patient: {patient.firstName} {patient.lastName}
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Patient updated successfully! Redirecting...
          </Alert>
        )}
        
        <PatientForm
          initialData={patient}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/patients/${id}`)}
          submitButtonText="Save Changes"
          loading={saving}
          error={error}
        />
      </Paper>
    </Box>
  );
};

export default PatientEdit;