import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
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

function App() {
  return (
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
  );
}

export default App;
