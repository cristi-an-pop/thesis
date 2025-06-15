import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { getPatientById, deletePatient } from '../../services/PatientsService';
import { getPatientCases, deleteCase } from '../../services/CasesService';
import { Patient } from '../../types/Patient';
import { Case } from '../../types/Case';
import PatientInfo from '../../components/patient/PatientInfo';
import CaseForm from '../../components/case/CaseForm';
import PatientHistory from '../../components/patient/PatientHistory';
import TabPanel from '../../components/common/TabPanel';
import AppButton from '../../components/common/AppButton';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import { handleError } from '../../lib/ErrorHandler';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const fetchPatientData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const patientData = await getPatientById(id);
      if (!patientData) {
        setError('Patient not found');
        return;
      }
      
      setPatient(patientData);
      
      try {
        const casesData = await getPatientCases(id);
        setCases(casesData || []);
      } catch (caseError) {
        handleError(caseError, 'Failed to load patient cases');
        setCases([]);
      }
      
    } catch (err) {
      handleError(err, 'Failed to load patient');
      setError('Failed to load patient');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPatientData();
  }, [id]);
  
  const handleChangeTab = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleDeletePatient = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await deletePatient(id);
      navigate('/patients');
    } catch (err) {
      handleError(err, 'Failed to delete patient');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await deleteCase(caseId);
      setCases(prevCases => prevCases.filter(c => c.id !== caseId));
    } catch (error) {
      handleError(error, 'Failed to delete case');
      throw error;
    }
  };
  
  const handleCaseSubmitSuccess = (caseId: string) => {
    navigate(`/patients/${id}/cases/${caseId}`);
  };
  
  if (error) return <Error message={error} onRetry={fetchPatientData} />;
  if (loading) return <Loading message="Loading patient details..." type="skeleton" />;
  if (!patient) return <Error message="Patient not found" onRetry={() => navigate('/patients')} />;
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {patient.firstName} {patient.lastName}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Edit
          </AppButton>
          <AppButton
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            loading={deleting}
          >
            Delete
          </AppButton>
        </Box>
      </Box>
      
      {/* Patient Information */}
      <PatientInfo patient={patient} />
      
      {/* Tabs for Add Case and Patient History */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleChangeTab}
            aria-label="patient tabs"
          >
            <Tab label="Add New Case" />
            <Tab label="Patient History" />
          </Tabs>
        </Box>
        
        {/* Add New Case Tab */}
        <TabPanel value={tabValue} index={0}>
          <CaseForm 
            patientId={id!} 
            onSubmitSuccess={handleCaseSubmitSuccess} 
          />
        </TabPanel>
        
        {/* Patient History Tab */}
        <TabPanel value={tabValue} index={1}>
          <PatientHistory 
            patientId={id!}
            cases={cases}
            onCaseClick={(caseId) => navigate(`/patients/${id}/cases/${caseId}`)}
            onDeleteCase={handleDeleteCase}
          />
        </TabPanel>
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${patient?.firstName} ${patient?.lastName}?`}
        onConfirm={handleDeletePatient}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleting}
      />
    </Box>
  );
};

export default PatientDetails;