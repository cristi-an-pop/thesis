import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthService from "../../services/AuthService";
import useAuth from "../../hooks/useAuth";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Breadcrumbs,
  Link as MuiLink,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { getPatientById } from "../../services/PatientsService";
import { getCaseById } from "../../services/CasesService";

// Define breadcrumb item interface
interface BreadcrumbItem {
  label: string;
  path: string | null;
}

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // State for dynamic data in breadcrumbs
  const [dynamicBreadcrumbs, setDynamicBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoadingBreadcrumbs, setIsLoadingBreadcrumbs] = useState(false);

  // Process URL and load any required data for breadcrumbs
  useEffect(() => {
    const generateDynamicBreadcrumbs = async () => {
      const pathSegments = location.pathname.split('/').filter(segment => segment);
      
      // Home page - no breadcrumbs needed
      if (pathSegments.length === 0) {
        setDynamicBreadcrumbs([]);
        return;
      }
      
      // Start building breadcrumbs
      const breadcrumbs: BreadcrumbItem[] = [];
      
      // Always add home
      breadcrumbs.push({ label: 'Home', path: '/' });
      
      // Process path segments
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        const currentPath = `/${pathSegments.slice(0, i + 1).join('/')}`;
        
        // Handle different patterns based on the URL structure
        if (i === 0) {
          // First level: main sections
          switch (segment) {
            case 'patients':
              breadcrumbs.push({ label: 'Patients', path: '/patients' });
              break;
            case 'cases':
              breadcrumbs.push({ label: 'Cases', path: '/cases' });
              break;
            case 'xrays':
              breadcrumbs.push({ label: 'X-Rays', path: '/xrays' });
              break;
            default:
              // Default: capitalize the segment name
              const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
              breadcrumbs.push({ label: formattedLabel, path: currentPath });
          }
        } 
        else if (i === 1 && pathSegments[0] === 'patients') {
          // Second level under patients: could be 'new' or a patient ID
          if (segment === 'new') {
            breadcrumbs.push({ label: 'Add Patient', path: null });
          } else {
            // It's likely a patient ID, load patient info
            setIsLoadingBreadcrumbs(true);
            try {
              const patient = await getPatientById(segment);
              if (patient) {
                breadcrumbs.push({
                  label: `${patient.firstName} ${patient.lastName}`,
                  path: currentPath
                });
              } else {
                breadcrumbs.push({ label: 'Patient Details', path: currentPath });
              }
            } catch (err) {
              console.error('Error loading patient data for breadcrumbs:', err);
              breadcrumbs.push({ label: 'Patient Details', path: currentPath });
            } finally {
              setIsLoadingBreadcrumbs(false);
            }
          }
        }
        else if (i === 1 && pathSegments[0] === 'cases') {
          // Second level under cases: could be 'new' or a case ID
          if (segment === 'new') {
            breadcrumbs.push({ label: 'Add Case', path: null });
          } else {
            // It's likely a case ID, load case info
            setIsLoadingBreadcrumbs(true);
            try {
              const caseData = await getCaseById(segment);
              if (caseData) {
                breadcrumbs.push({
                  label: caseData.title || 'Case Details',
                  path: currentPath
                });
              } else {
                breadcrumbs.push({ label: 'Case Details', path: currentPath });
              }
            } catch (err) {
              console.error('Error loading case data for breadcrumbs:', err);
              breadcrumbs.push({ label: 'Case Details', path: currentPath });
            } finally {
              setIsLoadingBreadcrumbs(false);
            }
          }
        }
        else if (i === 2 && pathSegments[0] === 'patients') {
          // Third level under patients: actions on a patient
          switch (segment) {
            case 'edit':
              breadcrumbs.push({ label: 'Edit', path: null });
              break;
            case 'new':
              breadcrumbs.push({ label: 'Add Case', path: null });
              break;
            case 'xrays':
              breadcrumbs.push({ label: 'X-Rays', path: currentPath });
              break;
            default:
              // Default: capitalize the segment name
              const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
              breadcrumbs.push({ label: formattedLabel, path: currentPath });
          }
        }
        else {
          // Default handling for other segments
          const formattedLabel = segment
            .replace(/-/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());
          breadcrumbs.push({ label: formattedLabel, path: i === pathSegments.length - 1 ? null : currentPath });
        }
      }
      
      setDynamicBreadcrumbs(breadcrumbs);
    };

    generateDynamicBreadcrumbs();
  }, [location.pathname]);

  // Generate breadcrumbs component
  const generateBreadcrumbs = () => {
    // No breadcrumbs for home page
    if (dynamicBreadcrumbs.length <= 1) return null;
    
    return (
      <Breadcrumbs 
        separator="›"
        aria-label="breadcrumb"
        sx={{ 
          py: 2, 
          color: 'text.secondary',
          '& .MuiBreadcrumbs-separator': {
            mx: 1
          }
        }}
      >
        {isLoadingBreadcrumbs ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading...</Typography>
          </Box>
        ) : (
          dynamicBreadcrumbs.map((crumb, index) => {
            const isLast = index === dynamicBreadcrumbs.length - 1;
            
            // Last item isn't clickable
            if (isLast || crumb.path === null) {
              return (
                <Typography 
                  key={`${crumb.label}-${index}`} 
                  color="text.primary"
                  sx={{ fontWeight: 500 }}
                >
                  {crumb.label}
                </Typography>
              );
            }
            
            // Links for other items
            return (
              <MuiLink
                component={Link}
                to={crumb.path}
                key={`${crumb.label}-${index}`}
                color="inherit"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': { 
                    color: 'primary.main', 
                    textDecoration: 'underline' 
                  },
                }}
              >
                {crumb.label}
              </MuiLink>
            );
          })
        )}
      </Breadcrumbs>
    );
  };

  const signOut = async () => {
    await AuthService.doSignOut().then(() => {
      navigate("/login");
    })
  };

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component={Link}
            to="/"
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600, 
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            Confi<span style={{ color: '#fff' }}>Dent</span>
          </Typography>
          
          {currentUser ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button 
                color="inherit" 
                component={Link} 
                to="/"
                sx={{
                  borderRadius: theme.shape.borderRadius,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                }}
              >
                Home
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/patients"
                sx={{
                  borderRadius: theme.shape.borderRadius,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                }}
              >
                Patients
              </Button>
              <Button 
                color="inherit" 
                onClick={signOut}
                sx={{ 
                  ml: 1,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } 
                }}
              >
                Sign Out
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                component={Link} 
                to="/login"
                sx={{ borderRadius: theme.shape.borderRadius }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                to="/register"
                sx={{ borderRadius: theme.shape.borderRadius }}
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Container>
        {generateBreadcrumbs()}
        <Box sx={{ mb: 4 }}>
          <Outlet />
        </Box>
      </Container>
    </>
  );
};

export default Layout;