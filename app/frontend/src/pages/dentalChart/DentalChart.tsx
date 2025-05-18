import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  AppBar,
  Toolbar,
} from '@mui/material';
import { format } from 'date-fns';
import { getPatientById } from '../../services/PatientsService';
import { getCaseById, getPatientCases } from '../../services/CasesService';
import { getPatientXRayImages } from '../../services/XRayService';
import { Case } from '../../types/Case';
import { XRayImage } from '../../types/XRayImage';
import { Tooth, ToothCondition } from '../../types/Tooth';
import { getTeethByCaseId, updateToothCondition } from '../../services/TeethService';
import AppButton from '../../components/common/AppButton';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import XRayViewer from '@/components/dentalChart/XRayViewer';
import TeethGrid from '@/components/dentalChart/TeethGrid';

const teethSvgMap = {
  molar: '../../../teeth/molar.svg',
  premolar: '../../../teeth/premolar.svg',
  canine: '../../../teeth/canine.svg',
  incisor: '../../../teeth/incisive.svg',
};

const DentalChart = () => {
  const { patientId, caseId } = useParams<{ patientId: string; caseId: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<any>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [patientCases, setPatientCases] = useState<Case[]>([]);
  const [currentXRay, setCurrentXRay] = useState<XRayImage | null>(null);
  const [teeth, setTeeth] = useState<Tooth[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTooth, setSavingTooth] = useState(false);
  const [toothCondition, setToothCondition] = useState<string>('healthy');
  const [toothNotes, setToothNotes] = useState<string>('');
  const [toothConfidence, setToothConfidence] = useState<number>(100);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!patientId || !caseId) {
        setError('Missing patient ID or case ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const patientData = await getPatientById(patientId);
        setPatient(patientData);
        
        const caseData = await getCaseById(caseId);
        if (!caseData) {
          setError('Case not found');
          return;
        }
        setCurrentCase(caseData);
        
        const casesData = await getPatientCases(patientId);
        setPatientCases(casesData || []);
        
        const xrayData = await getPatientXRayImages(patientId);
        
        if (xrayData && xrayData.length > 0) {
          setCurrentXRay(xrayData[0]);
        }
      
        const teethData = await getTeethByCaseId(caseId);
        setTeeth(teethData);
      } catch (err) {
        console.error('Error fetching dental chart data:', err);
        setError('Failed to load dental chart data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [patientId, caseId]);
  
  const handleBack = () => {
    navigate(`/patients/${patientId}`);
  };
  
  const handleCaseSelect = (caseId: string) => {
    navigate(`/patients/${patientId}/cases/${caseId}`);
  };
  
  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => prev + 0.25);
    }
  };
  
  const handleZoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(prev => prev - 0.25);
    }
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
  };
  
  const handleToothSelect = (tooth: Tooth) => {
    setSelectedTooth(tooth);
    setToothCondition(tooth.currentCondition?.condition || 'missing');
    setToothNotes(tooth.currentCondition?.notes || '');
    setToothConfidence(tooth.currentCondition?.confidence || 100);
  };

  const handleSaveTooth = async () => {
    if (!selectedTooth) return;
    
    try {
      setSavingTooth(true);
      
      const newCondition: ToothCondition = {
        condition: toothCondition as any,
        notes: toothNotes,
        confidence: toothConfidence,
        date: new Date()
      };
      
      await updateToothCondition(selectedTooth.id, newCondition, patientId!, caseId);
      
      setTeeth(teeth.map(tooth => {
        if (tooth.id === selectedTooth.id) {
          return {
            ...tooth,
            conditions: [...(tooth.conditions || []), newCondition],
            currentCondition: newCondition
          };
        }
        return tooth;
      }));
      
      setSelectedTooth({
        ...selectedTooth,
        conditions: [...(selectedTooth.conditions || []), newCondition],
        currentCondition: newCondition
      });
      
    } catch (err) {
      console.error('Error updating tooth condition:', err);
    } finally {
      setSavingTooth(false);
    }
  };

  const getToothColor = (condition: string): string => {
    switch (condition) {
      case 'healthy': return '#ffffff';
      case 'missing': return '#ffcc00';
      case 'low': return '#c0c0c0';
      case 'medium': return '#ffff00';
      case 'high': return '#ff6666';
      default: return '#ffffff';
    }
  };
  
  const getToothTooltip = (tooth: Tooth): string => {
    const position = `${tooth.position.quadrant === 1 || tooth.position.quadrant === 2 ? 'Upper' : 'Lower'} ${tooth.position.quadrant === 1 || tooth.position.quadrant === 4 ? 'Right' : 'Left'}`;
    const toothNumber = tooth.position.number;
    const toothName = getToothName(tooth.position.quadrant, tooth.position.number);
    const condition = tooth.currentCondition?.condition || 'healthy';
    
    return `${position} ${toothName} (${toothNumber})\nCondition: ${condition}`;
  };
  
  const getToothName = (_: number, position: number): string => {
    switch (position) {
      case 1: return 'Third Molar';
      case 2: return 'Second Molar';
      case 3: return 'First Molar';
      case 4: return 'Second Premolar';
      case 5: return 'First Premolar';
      case 6: return 'Canine';
      case 7: return 'Lateral Incisor';
      case 8: return 'Central Incisor';
      default: return 'Unknown';
    }
  };
  
  const renderToothSvg = (tooth: Tooth) => {
    const color = getToothColor(tooth.currentCondition?.condition || 'healthy');
    let svgPath = '';
    
    // Molars (positions 1-3)
    if (tooth.position.number <= 3) {
      svgPath = teethSvgMap.molar;
    } 
    // Premolars (positions 4-5)
    else if (tooth.position.number <= 5) {
      svgPath = teethSvgMap.premolar;
    }
    // Canines (position 6)
    else if (tooth.position.number === 6) {
      svgPath = teethSvgMap.canine;
    }
    // Incisors (positions 7-8)
    else {
      svgPath = teethSvgMap.incisor;
    }
    
    return (
      <Box
        component="img"
        src={svgPath}
        alt={`Tooth ${tooth.position.number}`}
        sx={{
          width: 40,
          height: 40,
          fill: color,
          filter: `drop-shadow(0 0 2px ${color})`,
          transition: 'fill 0.3s ease-out',
        }}
      />
    );
  };
  
  const upperTeeth = teeth.filter(tooth => 
    tooth.position.quadrant === 1 || tooth.position.quadrant === 2
  ).sort((a, b) => {
    if (a.position.quadrant !== b.position.quadrant) {
      return a.position.quadrant === 1 ? -1 : 1;
    }
    
    if (a.position.quadrant === 1) {
      return b.position.number - a.position.number;
    }
    return a.position.number - b.position.number;
  });
  
  const lowerTeeth = teeth.filter(tooth => 
    tooth.position.quadrant === 4 || tooth.position.quadrant === 3
  ).sort((a, b) => {
    if (a.position.quadrant !== b.position.quadrant) {
      return a.position.quadrant === 4 ? -1 : 1;
    }

    if (a.position.quadrant === 4) {
      return b.position.number - a.position.number;
    }
    return a.position.number - b.position.number;
  });
  
  const getToothPositionDescription = (tooth: Tooth): string => {
    const quadrantNames: {[key: number]: string} = {
      1: 'Upper Right',
      2: 'Upper Left',
      3: 'Lower Left',
      4: 'Lower Right'
    };
    
    const toothNames: {[key: number]: string} = {
      1: 'Third Molar (Wisdom)',
      2: 'Second Molar',
      3: 'First Molar',
      4: 'Second Premolar',
      5: 'First Premolar',
      6: 'Canine',
      7: 'Lateral Incisor',
      8: 'Central Incisor'
    };
    
    const quadrant = quadrantNames[tooth.position.quadrant];
    const toothName = toothNames[tooth.position.number];
    
    return `${quadrant} ${toothName}`;
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !currentCase) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'Could not load dental chart data'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <AppButton variant="outlined" onClick={handleBack}>
            Back to Patient
          </AppButton>
        </Box>
      </Box>
    );
  }
  
  return (
    <>
      {/* Custom header */}
      <AppBar position="fixed" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {patient && `${patient.firstName} ${patient.lastName} - `}{currentCase.title}
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Main content */}
      <Box
        sx={{
          position: 'absolute',
          top: 64, // AppBar height
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <Grid container sx={{ height: '100%' }} spacing={0}>
          {/* Left sidebar - Patient Cases History */}
          <Grid item xs={12} md={2} sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                Patient Cases
              </Typography>
              
              {patientCases.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No cases available
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {patientCases.map((patientCase) => (
                    <ListItem 
                      key={patientCase.id} 
                      disablePadding
                      sx={{ 
                        mb: 0.5, 
                        bgcolor: patientCase.id === caseId ? 'action.selected' : 'transparent',
                        borderRadius: 1
                      }}
                    >
                      <ListItemButton onClick={() => handleCaseSelect(patientCase.id!)}>
                        <ListItemText 
                          primary={patientCase.title}
                          secondary={patientCase.createdAt ? format(patientCase.createdAt, 'MMM d, yyyy') : 'No date'} 
                          primaryTypographyProps={{ 
                            variant: 'body2', 
                            fontWeight: patientCase.id === caseId ? 'bold' : 'normal' 
                          }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Grid>
          
          {/* Center - X-Ray Viewer and Tooth Grid */}
          <Grid item xs={12} md={7} sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
            {/* X-Ray Viewer */}
            <XRayViewer
              xray={currentXRay}
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
            />
            {/* Dental Chart - Teeth Grid */}
            <TeethGrid
              teeth={teeth}
              selectedTooth={selectedTooth}
              onToothSelect={handleToothSelect}
              renderToothSvg={renderToothSvg}
              getToothTooltip={getToothTooltip}
            />
          </Grid>
          
          {/* Right sidebar - Tooth Details */}
          <Grid item xs={12} md={3} sx={{ height: '100%', borderLeft: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {!selectedTooth ? (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" textAlign="center">
                    Select a tooth to view details
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Tooth Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {getToothPositionDescription(selectedTooth)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    European: {selectedTooth.europeanNumber || (selectedTooth.position.quadrant * 10 + selectedTooth.position.number)}
                  </Typography>
                  
                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="body2" gutterBottom>
                      Condition: {toothCondition}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Confidence: {toothConfidence}%
                    </Typography>
                  </Box>
                  
                  <TextField
                    label="Notes"
                    multiline
                    rows={4}
                    value={toothNotes}
                    onChange={(e) => setToothNotes(e.target.value)}
                    fullWidth
                    sx={{ mb: 3 }}
                    disabled={savingTooth}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <AppButton
                      variant="contained"
                      color="primary"
                      onClick={handleSaveTooth}
                      loading={savingTooth}
                    >
                      Save Changes
                    </AppButton>
                  </Box>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default DentalChart;