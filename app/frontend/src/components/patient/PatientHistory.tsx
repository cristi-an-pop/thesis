import { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton,
  Tooltip
} from '@mui/material';
import { Case } from '../../types/Case';
import { format } from 'date-fns';
import { DataTable, ColumnDef } from '../common/DataTable';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationDialog from '../common/ConfirmationDialog';

interface PatientHistoryProps {
  patientId: string;
  cases: Case[];
  onCaseClick: (caseId: string) => void;
  onDeleteCase?: (caseId: string) => Promise<void>;
}

const PatientHistory = ({
  cases,
  onCaseClick,
  onDeleteCase
}: PatientHistoryProps) => {
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, row: Case) => {
    e.stopPropagation();
    setCaseToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete || !caseToDelete.id || !onDeleteCase) return;
    
    try {
      setDeleteLoading(true);
      await onDeleteCase(caseToDelete.id);
      setCaseToDelete(null);
    } catch (error) {
      console.error('Error deleting case:', error);
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
      cell: (row) => row.createdAt ? format(row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt), 'MMM d, yyyy') : 'Date unknown',
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
    },
    {
      id: 'diagnosis',
      header: 'Diagnosis',
      cell: (row) => row.diagnosis?.map(d => d.name).join(', ') || '-',
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Delete case">
            <IconButton 
              size="small" 
              onClick={(e) => handleDeleteClick(e, row)}
              aria-label="delete case"
            >
            <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      width: 80,
    },
  ];

  const handleRowClick = (row: Case) => {
    if (row.id) {
      onCaseClick(row.id);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Treatment History
      </Typography>

      <DataTable
        data={cases}
        columns={columns}
        getRowId={(row) => row.id || ''}
        onRowClick={handleRowClick}
        defaultSortColumn="createdAt"
        defaultSortDirection="desc"
        emptyMessage="No treatment history available for this patient."
        pagination={true}
        pageSize={5}
        searchable={true}
        searchPlaceholder="Search cases..."
        paperProps={{
          elevation: 0,
          variant: "outlined"
        }}
      />

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

export default PatientHistory;