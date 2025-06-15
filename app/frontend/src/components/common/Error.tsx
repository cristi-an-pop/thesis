import { Box, Typography, Button, Alert } from '@mui/material';
import { RefreshOutlined, ErrorOutline } from '@mui/icons-material';

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
  type?: 'page' | 'inline';
}

const Error = ({ 
  message = "Something went wrong", 
  onRetry,
  type = 'page'
}: ErrorProps) => {
  
  if (type === 'inline') {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {message}
        {onRetry && (
          <Button size="small" onClick={onRetry} sx={{ ml: 2 }}>
            Retry
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2,
        py: 6,
        textAlign: 'center'
      }}
    >
      <ErrorOutline sx={{ fontSize: 64, color: 'error.main' }} />
      <Typography variant="h6" color="error">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Box>
  );
};

export default Error;