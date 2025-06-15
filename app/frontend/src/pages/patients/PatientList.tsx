import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { getPatients, searchPatients } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import { DataTable, ColumnDef } from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import { handleError } from '../../lib/ErrorHandler';
import ExportService from '../../services/ExportService';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';

const PatientList = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      handleError(err, "Failed to load patients");
      setError("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      const results = searchTerm.trim() 
        ? await searchPatients(searchTerm)
        : await getPatients();
      setPatients(results);
      setError(null);
    } catch (err) {
      handleError(err, "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await ExportService.exportTrainingData();
    } catch (err) {
      handleError(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnDef<Patient>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => `${row.lastName}, ${row.firstName}`,
      sortable: true
    },
    {
      id: 'email',
      header: 'Email',
      sortable: true
    },
    {
      id: 'phoneNumber',
      header: 'Phone',
      sortable: false
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      cell: (row) => (
        <>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.id}`);
            }}
            title="View patient"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.id}/edit`);
            }}
            title="Edit patient"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </>
      )
    }
  ];

  if (error) return <Error message={error} onRetry={fetchPatients} />;
  if (loading) return <Loading message="Loading patients..." />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Patients
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/patients/new')}
          >
            Add Patient
          </Button>
        </Box>
      </Box>

      <DataTable
        data={patients}
        columns={columns}
        getRowId={(row) => row.id || ''}
        onRowClick={(patient) => navigate(`/patients/${patient.id}`)}
        searchable={true}
        searchPlaceholder="Search patients..."
        onSearch={handleSearch}
        defaultSortColumn="lastName"
        emptyMessage="No patients found"
        paperProps={{ elevation: 1 }}
      />
    </Box>
  );
};

export default PatientList;