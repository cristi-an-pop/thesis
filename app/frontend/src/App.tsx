import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ThemeProvider, CssBaseline, Snackbar, Alert } from "@mui/material";
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
import Loading from "./components/common/Loading";
import ModelService from "./services/ModelService";
import { setErrorCallback, handleError, AppError } from "./lib/ErrorHandler";

function App() {
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('error');

  // Setup error callback for toast notifications
  useEffect(() => {
    setErrorCallback((error: AppError) => {
      setToastMessage(error.message);
      setToastSeverity('error');
      setToastOpen(true);
    });
  }, []);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        await ModelService.loadModel();
      } catch (error) {
        handleError(error, 'AI model failed to load');
        setModelError('AI model failed to load - manual diagnosis only');
      } finally {
        setModelLoading(false);
      }
    };

    initializeModel();
  }, []);

  const handleToastClose = () => {
    setToastOpen(false);
  };

  if (modelLoading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Loading 
          message="Loading AI Model... This may take a moment on first load" 
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Model Error Warning */}
      {modelError && (
        <Alert severity="warning" sx={{ mb: 2, mx: 2, mt: 2 }}>
          {modelError}
        </Alert>
      )}
      
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

      {/* Global Toast Notifications */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleToastClose} 
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;