import { useNavigate } from "react-router-dom";
import { Typography, Button, Box } from "@mui/material";

const Unauthorized = () => {
  const navigate = useNavigate();

  const goBack = () => navigate(-1);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
      }}
    >
      <Typography variant="h2">Unauthorized</Typography>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={goBack}>
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

export default Unauthorized;
