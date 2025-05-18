import React from "react";
import {
  Paper,
  Box,
  Typography,
  Alert,
  Container,
  ContainerProps,
} from "@mui/material";

interface FormContainerProps extends ContainerProps {
  title?: string;
  errorMessage?: string;
  children: React.ReactNode;
}

const FormContainer: React.FC<FormContainerProps> = ({
  title,
  errorMessage,
  children,
  ...props
}) => {
  return (
    <Container maxWidth="sm" {...props}>
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {title && (
            <Typography
              variant="h5"
              component="h1"
              gutterBottom
              sx={{ mb: 3 }}
            >
              {title}
            </Typography>
          )}

          {errorMessage && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
            >
              {errorMessage}
            </Alert>
          )}

          {children}
        </Paper>
      </Box>
    </Container>
  );
};

export default FormContainer;