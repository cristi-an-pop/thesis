import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Container, Typography, Grid, Avatar, IconButton, List, ListItem, ListItemAvatar, ListItemText, ListItemButton } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Loading from '../../components/common/Loading';
import Error from '../../components/common/Error';
import useAuth from '../../hooks/useAuth';
import { getPatients } from '../../services/PatientsService';
import { getAllCases } from '../../services/CasesService';
import { handleError } from '../../lib/ErrorHandler';
import { Patient } from '../../types/Patient';
import { Case } from '../../types/Case';
import { formatFirestoreDate } from '../../lib/utils';

import PeopleIcon from '@mui/icons-material/People';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

interface DashboardStats {
  totalPatients: number;
  totalCases: number;
  totalDiagnoses: number;
  casesThisMonth: number;
  diagnosisDistribution: Array<{ name: string; value: number; color: string }>;
  recentCases: Case[];
  recentPatients: Patient[];
}

const DIAGNOSIS_COLORS = [
  '#3f88f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [patients, cases] = await Promise.all([
        getPatients(), 
        getAllCases()
      ]);

      const totalPatients = patients.length;
      const totalCases = cases.length;
      
      const allDiagnoses = cases.flatMap(c => c.diagnosis || []);
      const totalDiagnoses = allDiagnoses.length;
      
      const thisMonth = new Date();
      const casesThisMonth = cases.filter(c => {
        const caseDate = new Date(formatFirestoreDate(c.createdAt));
        return caseDate.getMonth() === thisMonth.getMonth() && 
               caseDate.getFullYear() === thisMonth.getFullYear();
      }).length;

      const diagnosisCount: { [key: string]: number } = {};
      allDiagnoses.forEach(diagnosis => {
        diagnosisCount[diagnosis.name] = (diagnosisCount[diagnosis.name] || 0) + 1;
      });
      
      const diagnosisDistribution = Object.entries(diagnosisCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([name, value], index) => ({
          name,
          value,
          color: DIAGNOSIS_COLORS[index % DIAGNOSIS_COLORS.length]
        }));

      const recentCases = cases
        .sort((a, b) => {
          const dateA = formatFirestoreDate(a.createdAt);
          const dateB = formatFirestoreDate(b.createdAt);
          const dateAObj = new Date(dateA);
          const dateBObj = new Date(dateB);
          return dateBObj.getTime() - dateAObj.getTime();
        })
        .slice(0, 5);

      const recentPatients = patients
        .sort((a, b) => {
          const dateA = new Date(formatFirestoreDate(a.createdAt));
          const dateB = new Date(formatFirestoreDate(b.createdAt));
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);

      setStats({
        totalPatients,
        totalCases,
        totalDiagnoses,
        casesThisMonth,
        diagnosisDistribution,
        recentCases,
        recentPatients
      });

    } catch (err) {
      // Use ErrorHandler for logging, but keep local error state for fallback UI
      handleError(err, "Failed to load dashboard data");
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }) => (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!currentUser) {
    return (
      <Container sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom color="primary" fontWeight="bold">
          Medical Case Management System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Efficient X-ray analysis and patient case management
        </Typography>
      </Container>
    );
  }

  if (error) {
    return <Error message={error} onRetry={fetchDashboardData} />;
  }

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Welcome back, Dr. {currentUser.email?.split('@')[0]}
        </Typography>
        <IconButton onClick={fetchDashboardData} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Patients"
            value={stats?.totalPatients || 0}
            icon={<PeopleIcon />}
            color="#3f88f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Cases"
            value={stats?.totalCases || 0}
            icon={<AssignmentIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Diagnoses"
            value={stats?.totalDiagnoses || 0}
            icon={<MedicalServicesIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cases This Month"
            value={stats?.casesThisMonth || 0}
            icon={<TrendingUpIcon />}
            color="#8b5cf6"
            subtitle="Current month"
          />
        </Grid>
      </Grid>

      {/* Diagnosis Distribution Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Common Diagnoses
              </Typography>
              {stats?.diagnosisDistribution.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.diagnosisDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {stats.diagnosisDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Typography color="text.secondary">No diagnosis data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Cases */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Cases
                </Typography>
                <Link to="/patients" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    View all
                  </Typography>
                </Link>
              </Box>
              
              {stats?.recentCases.length ? (
                <List sx={{ p: 0, maxHeight: 320, overflow: 'auto' }}>
                  {stats.recentCases.map((case_, index) => (
                    <ListItem key={case_.id || index} disablePadding>
                      <ListItemButton
                        onClick={() => navigate(`/patients/${case_.patientId}/cases/${case_.id}`)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <AssignmentIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={case_.title}
                          secondary={formatFirestoreDate(case_.createdAt)}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                        <IconButton size="small">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Typography color="text.secondary">No recent cases</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Patients */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Patients
                </Typography>
                <Link to="/patients" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    View all
                  </Typography>
                </Link>
              </Box>
              
              {stats?.recentPatients.length ? (
                <Grid container spacing={2}>
                  {stats.recentPatients.map((patient, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={patient.id || index}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 1 }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {`${patient.firstName} ${patient.lastName}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFirestoreDate(patient.createdAt)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No recent patients</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;