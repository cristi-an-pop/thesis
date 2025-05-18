import { Box, Typography, Grid, Divider, Paper } from '@mui/material';
import { Patient } from '../../types/Patient';
import { format } from 'date-fns';

interface PatientInfoProps {
  patient: Patient;
}

const PatientInfo = ({ patient }: PatientInfoProps) => {
  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1">
              {patient.email || 'Not provided'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Phone
            </Typography>
            <Typography variant="body1">
              {patient.phoneNumber || 'Not provided'}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Date of Birth
            </Typography>
            <Typography variant="body1">
              {patient.dateOfBirth 
                ? format(patient.dateOfBirth, 'MMMM d, yyyy')
                : 'Not provided'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Address
            </Typography>
            <Typography variant="body1">
              {patient.address || 'Not provided'}
            </Typography>
          </Box>
        </Grid>
        
        {patient.notes && (
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body1">
              {patient.notes}
            </Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default PatientInfo;