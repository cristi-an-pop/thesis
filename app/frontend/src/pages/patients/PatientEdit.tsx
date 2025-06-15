import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { getPatientById, updatePatient } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import PatientForm from '../../components/patient/PatientForm';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import { handleError } from '../../lib/ErrorHandler';

const PatientEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const fetchPatient = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const patientData = await getPatientById(id);
      setPatient(patientData);
    } catch (err) {
      handleError(err, 'Failed to load patient');
      setError('Failed to load patient');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPatient();
  }, [id]);
  
  const handleSubmit = async (patientData: Omit<Patient, 'id'>) => {
    if (!id) return;
    
    try {
      setSaving(true);
      await updatePatient(id, patientData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/patients/${id}`);
      }, 1000);
      
    } catch (err) {
      handleError(err, 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };
  
  if (error) return <Error message={error} onRetry={fetchPatient} />;
  if (loading) return <Loading message="Loading patient..." />;
  if (!patient) return <Error message="Patient not found" onRetry={() => navigate('/patients')} />;
  
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
        />
      </Paper>
    </Box>
  );
};

export default PatientEdit;