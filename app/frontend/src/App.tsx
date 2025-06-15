import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography, Alert } from "@mui/material";
import { darkTheme } from "./config/Theme";
import Home from "./pages/home/Home";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Unauthorized from "./components/Unauthorized";
import RequireAuth from "./components/RequireAuth";
import Missing from "./components/Missing";
import Layout from "./components/layout/Layout";
import PatientList from "./pages/patients/PatientList";
import PatientDetails from "./pages/patients/PatientDetails";
import PatientAdd from "./pages/patients/PatientAdd";
import PatientEdit from "./pages/patients/PatientEdit";
import CaseList from "./pages/cases/CaseList";
import CaseDetails from "./pages/cases/CaseDetails";
import { useEffect, useState } from "react";
import ModelService from "./services/ModelService";

function App() {
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('Preloading AI model...');
        await ModelService.loadModel();
        console.log('AI model ready!');
      } catch (error) {
        console.error('Failed to load AI model:', error);
        setModelError('AI model failed to load - manual diagnosis only');
      } finally {
        setModelLoading(false);
      }
    };

    initializeModel();
  }, []);

  if (modelLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6">Loading AI Model...</Typography>
        <Typography variant="body2" color="text.secondary">
          This may take a moment on first load
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {modelError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {modelError}
        </Alert>
      )}
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Home />} />
                <Route path="/patients" element={<PatientList />} />
                <Route path="/patients/:id" element={<PatientDetails />} />
                <Route path="/patients/new" element={<PatientAdd />} />
                <Route path="/patients/:id/edit" element={<PatientEdit />} />
                <Route path="/patients/:patientId/cases" element={<CaseList />} />
              </Route>
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/patients/:patientId/cases/:caseId" element={<CaseDetails />} />
            </Route>
            <Route path="*" element={<Missing />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </>
  );
}

export default App;
