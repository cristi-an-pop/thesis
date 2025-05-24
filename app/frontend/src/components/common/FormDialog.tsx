import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AppButton from './AppButton';

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  error?: string | null;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  showActions?: boolean;
  submitDisabled?: boolean;
}

const FormDialog = ({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  error = null,
  maxWidth = 'sm',
  fullWidth = true,
  showActions = true,
  submitDisabled = false
}: FormDialogProps) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={maxWidth} 
      fullWidth={fullWidth}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {children}
      </DialogContent>
      
      {showActions && (
        <DialogActions>
          <AppButton onClick={onClose} disabled={loading}>
            {cancelText}
          </AppButton>
          {onSubmit && (
            <AppButton 
              onClick={onSubmit}
              variant="contained"
              loading={loading}
              disabled={loading || submitDisabled}
            >
              {submitText}
            </AppButton>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FormDialog;