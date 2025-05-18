import { Link } from "react-router-dom";
import { Typography, Button, Box } from "@mui/material";

const Missing = () => {
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
      <Typography variant="h2">404 - Not Found</Typography>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" component={Link} to="/">
          Go Home
        </Button>
      </Box>
    </Box>
  );
};

export default Missing;
