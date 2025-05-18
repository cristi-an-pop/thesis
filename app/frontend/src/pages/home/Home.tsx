import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
} from "@mui/material";
import useAuth from "@/hooks/useAuth";

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <Container sx={{ mt: 4 }}>
      {currentUser && (
        <>
          <Typography variant="h4" gutterBottom>
            Welcome, {currentUser.email}!
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/patients"
            >
              Patients
            </Button>
          </Box>
        </>
      )}
      {!currentUser && (
        <Typography variant="h3" gutterBottom>
          Home
        </Typography>
      )}
    </Container>
  );
};

export default Home;
