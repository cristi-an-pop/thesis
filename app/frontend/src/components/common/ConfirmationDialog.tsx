import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import AppButton from './AppButton';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmationDialog = ({open, title, message, onConfirm, onCancel, loading = false }: ConfirmationDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onCancel} disabled={loading}>
          Cancel
        </AppButton>
        <AppButton onClick={onConfirm} color="error" loading={loading}>
          Delete
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;