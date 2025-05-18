import { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  Tooltip
} from '@mui/material';
import { Case } from '../../types/Case';
import { format } from 'date-fns';
import { DataTable, ColumnDef } from '../common/DataTable';
import DeleteIcon from '@mui/icons-material/Delete';
import AppButton from '../common/AppButton';

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
  // State for delete confirmation
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle delete click
  const handleDeleteClick = (e: React.MouseEvent, row: Case) => {
    e.stopPropagation(); // Prevent row click
    setCaseToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete || !caseToDelete.id || !onDeleteCase) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await onDeleteCase(caseToDelete.id);
      setCaseToDelete(null);
    } catch (error) {
      console.error('Error deleting case:', error);
      setDeleteError('Failed to delete case. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setCaseToDelete(null);
    setDeleteError(null);
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
      cell: (row) => row.diagnosis || '-',
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
      <Dialog
        open={!!caseToDelete}
        onClose={handleCancelDelete}
      >
        <DialogTitle>
          Delete Case
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteError ? (
              <Box component="span" color="error.main">{deleteError}</Box>
            ) : (
              <>
                Are you sure you want to delete the case "{caseToDelete?.title}"?
                <Box component="p" fontWeight="bold" mt={1}>
                  This action cannot be undone and will delete all associated dental records.
                </Box>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton onClick={handleCancelDelete} disabled={deleteLoading}>
            Cancel
          </AppButton>
          <AppButton 
            onClick={handleConfirmDelete} 
            color="error" 
            loading={deleteLoading}
            disabled={deleteLoading}
          >
            Delete
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientHistory;