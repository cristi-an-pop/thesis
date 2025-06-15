import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Paper, IconButton, Tooltip } from '@mui/material';
import { getPatientById } from '../../services/PatientsService';
import { getPatientCases, deleteCase } from '../../services/CasesService';
import { Patient } from '../../types/Patient';
import { Case } from '../../types/Case';
import { DataTable, ColumnDef } from '../../components/common/DataTable';
import AppButton from '../../components/common/AppButton';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { formatFirestoreDate } from '@/lib/utils';

import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

const CaseList = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;
      
      try {
        setLoading(true);
        
        const patientData = await getPatientById(patientId);
        setPatient(patientData);
        
        const casesData = await getPatientCases(patientId);
        setCases(casesData || []);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [patientId]);
  
  const handleBackToPatient = () => {
    navigate(`/patients/${patientId}`);
  };
  
  const handleCaseClick = (caseData: Case) => {
    if (caseData.id) {
      navigate(`/patients/${patientId}/cases/${caseData.id}`);
    }
  };
  
  const handleAddCase = () => {
    navigate(`/patients/${patientId}`, { state: { activeTab: 0 } });
  };
  
  const handleDeleteClick = (e: React.MouseEvent, caseData: Case) => {
    e.stopPropagation();
    setCaseToDelete(caseData);
  };
  
  const handleConfirmDelete = async () => {
    if (!caseToDelete || !caseToDelete.id) return;
    
    try {
      setDeleteLoading(true);
      
      await deleteCase(caseToDelete.id);
      
      setCases(prevCases => prevCases.filter(c => c.id !== caseToDelete.id));
      
      setCaseToDelete(null);
    } catch (err) {
      console.error('Error deleting case:', err);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleCancelDelete = () => {
    setCaseToDelete(null);
  };
  
  const columns: ColumnDef<Case>[] = [
    {
      id: 'createdAt',
      header: 'Date',
      cell: (row) => row.createdAt ? formatFirestoreDate(row.createdAt) : 'Date unknown',
      sortable: true,
      width: 120,
    },
    {
      id: 'title',
      header: 'Title',
      cell: (row) => (
        <Typography variant="subtitle2" fontWeight="medium">
          {row.title}
        </Typography>
      ),
      sortable: true,
    },
    {
      id: 'diagnosis',
      header: 'Diagnosis',
        cell: (row) => row.diagnosis?.map(d => d.name).join(', ') || '-',
      sortable: true,
    },
    {
      id: 'description',
      header: 'Description',
      cell: (row) => row.description ? (
        <Typography variant="body2" color="text.secondary" noWrap>
          {row.description}
        </Typography>
      ) : '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Tooltip title="Delete case">
          <IconButton 
            size="small" 
            onClick={(e) => handleDeleteClick(e, row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
      sortable: false,
      width: 100,
    },
  ];
  
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading cases...</Typography>
      </Box>
    );
  }
  
  if (error || !patient) {
    return (
      <Box sx={{ p: 3 }}>
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
    <Box sx={{ p: 3 }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBackToPatient} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Cases for {patient.firstName} {patient.lastName}
          </Typography>
        </Box>
        <AppButton
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCase}
        >
          Add Case
        </AppButton>
      </Box>
      
      {/* Cases Table */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <DataTable
          data={cases}
          columns={columns}
          getRowId={(row) => row.id || ''}
          onRowClick={handleCaseClick}
          defaultSortColumn="createdAt"
          defaultSortDirection="desc"
          emptyMessage="No cases available for this patient."
          pagination={true}
          pageSize={10}
          searchable={true}
          searchPlaceholder="Search cases..."
        />
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={caseToDelete !== null}
        title="Delete Case"
        message={`Are you sure you want to delete the case "${caseToDelete?.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleteLoading}
      />
    </Box>
  );
};

export default CaseList;