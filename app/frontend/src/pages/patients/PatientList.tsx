import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import { getPatients, searchPatients } from '../../services/PatientsService';
import { Patient } from '../../types/Patient';
import { DataTable, ColumnDef } from '../../components/common/DataTable';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import ExportService from '@/services/ExportService';

const PatientList = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);


  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await getPatients();
        setPatients(data);
        setError(undefined);
      } catch (error) {
        console.error('Error fetching patients:', error);
        setError('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      if (!searchTerm.trim()) {
        const data = await getPatients();
        setPatients(data);
      } else {
        const results = await searchPatients(searchTerm);
        setPatients(results);
      }
      setError(undefined);
    } catch (error) {
      console.error('Error searching patients:', error);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleAddPatient = () => {
    navigate('/patients/new');
  };

  const handleExportTrainingData = async () => {
    try {
      setExporting(true);
      setExportMenuAnchor(null);
      
      await ExportService.exportTrainingData();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
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
            onClick={handleExportTrainingData}
            disabled={exporting || loading}
          >
            Export Data
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddPatient}
          >
            Add Patient
          </Button>
        </Box>
      </Box>

      <DataTable
        data={patients}
        columns={columns}
        getRowId={(row) => row.id || ''}
        onRowClick={handleViewPatient}
        loading={loading}
        error={error}
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