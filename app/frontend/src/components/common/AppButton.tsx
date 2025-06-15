import React from "react";
import { Button, ButtonProps, CircularProgress } from "@mui/material";

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

const AppButton: React.FC<AppButtonProps> = ({children, loading, disabled, ...props}) => {
  return (
    <Button
      disabled={disabled || loading}
      sx={{ 
        position: 'relative',
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={24} color="inherit" sx={{ position: 'absolute' }} />
      ) : null}
      <span style={{ visibility: loading ? 'hidden' : 'visible' }}>
        {children}
      </span>
    </Button>
  );
};

export default AppButton;
