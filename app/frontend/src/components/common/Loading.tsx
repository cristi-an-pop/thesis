import { Box, CircularProgress, Skeleton, Typography } from '@mui/material';

interface LoadingProps {
  type?: 'spinner' | 'skeleton';
  message?: string;
  rows?: number;
  height?: number;
}

const Loading = ({ 
  type = 'spinner', 
  message, 
  rows = 3, 
  height = 80 
}: LoadingProps) => {
  
  if (type === 'skeleton') {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={height}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
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
        py: 4
      }}
    >
      <CircularProgress />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Loading;
