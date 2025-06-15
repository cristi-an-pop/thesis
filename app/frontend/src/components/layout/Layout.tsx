import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppBar, Toolbar, Typography, Button, Container, Box, Breadcrumbs, Link as MuiLink, useTheme, CircularProgress } from "@mui/material";
import { getPatientById } from "../../services/PatientsService";
import { getCaseById } from "../../services/CasesService";
import { handleError } from "../../lib/ErrorHandler";
import AuthService from "../../services/AuthService";
import useAuth from "../../hooks/useAuth";

interface BreadcrumbItem {
  label: string;
  path: string | null;
}

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [dynamicBreadcrumbs, setDynamicBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoadingBreadcrumbs, setIsLoadingBreadcrumbs] = useState(false);

  useEffect(() => {
    const generateDynamicBreadcrumbs = async () => {
      const pathSegments = location.pathname.split('/').filter(segment => segment);
      
      if (pathSegments.length === 0) {
        setDynamicBreadcrumbs([]);
        return;
      }
      
      const breadcrumbs: BreadcrumbItem[] = [];
      breadcrumbs.push({ label: 'Home', path: '/' });
      
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        const currentPath = `/${pathSegments.slice(0, i + 1).join('/')}`;
        
        if (i === 0) {
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
              const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
              breadcrumbs.push({ label: formattedLabel, path: currentPath });
          }
        } 
        else if (i === 1 && pathSegments[0] === 'patients') {
          if (segment === 'new') {
            breadcrumbs.push({ label: 'Add Patient', path: null });
          } else {
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
              handleError(err, "Failed to load patient for breadcrumb");
              breadcrumbs.push({ label: 'Patient Details', path: currentPath });
            } finally {
              setIsLoadingBreadcrumbs(false);
            }
          }
        }
        else if (i === 1 && pathSegments[0] === 'cases') {
          if (segment === 'new') {
            breadcrumbs.push({ label: 'Add Case', path: null });
          } else {
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
              handleError(err, "Failed to load case for breadcrumb");
              breadcrumbs.push({ label: 'Case Details', path: currentPath });
            } finally {
              setIsLoadingBreadcrumbs(false);
            }
          }
        }
        else if (i === 2 && pathSegments[0] === 'patients') {
          switch (segment) {
            case 'edit':
              breadcrumbs.push({ label: 'Edit', path: null });
              break;
            case 'cases':
              breadcrumbs.push({ label: 'Cases', path: currentPath });
              break;
            case 'xrays':
              breadcrumbs.push({ label: 'X-Rays', path: currentPath });
              break;
            default:
              const formattedLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
              breadcrumbs.push({ label: formattedLabel, path: currentPath });
          }
        }
        else if (i === 3 && pathSegments[0] === 'patients' && pathSegments[2] === 'cases') {
          if (segment === 'new') {
            breadcrumbs.push({ label: 'Add Case', path: null });
          } else {
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
              handleError(err, "Failed to load case for breadcrumb");
              breadcrumbs.push({ label: 'Case Details', path: currentPath });
            } finally {
              setIsLoadingBreadcrumbs(false);
            }
          }
        }
        else {
          const formattedLabel = segment
            .replace(/-/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());
          breadcrumbs.push({ 
            label: formattedLabel, 
            path: i === pathSegments.length - 1 ? null : currentPath 
          });
        }
      }
      
      setDynamicBreadcrumbs(breadcrumbs);
    };

    generateDynamicBreadcrumbs();
  }, [location.pathname]);

  const generateBreadcrumbs = () => {
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
    try {
      await AuthService.doSignOut();
      navigate("/login");
    } catch (error) {
      navigate("/login");
    }
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
            Chest<span style={{ color: '#fff' }}>Net</span>
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