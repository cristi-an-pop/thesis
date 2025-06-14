import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
  List,
  ListItemText,
  ListItemButton,
  ListItem,
  TextField,
  Slider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { getCaseById, getPatientCases, updateCase } from '../../services/CasesService';
import { getPatientById } from '../../services/PatientsService';
import { getPatientXRayImages } from '../../services/XRayService';
import { Patient } from '@/types/Patient';
import { BoundingBox, Case, Diagnosis, Note } from '@/types/Case';
import { XRayImage } from '@/types/XRayImage';
import AppButton from '@/components/common/AppButton';
import XRayCanvas, { XRayCanvasRef } from '@/components/case/XRayCanvas';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import TabsContainer, { TabItem } from '@/components/common/TabsContainer';
import DownloadIcon from '@mui/icons-material/Download';
import ReportService from '../../services/ReportService';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GradCAMService from '../../services/GradCAMService';

const CaseDetails = () => {
  const { patientId, caseId } = useParams();
  const navigate = useNavigate();
  const xrayCanvasRef = useRef<XRayCanvasRef>(null);

  // Basic state
  const [patient, setPatient] = useState<Patient>();
  const [currentCase, setCurrentCase] = useState<Case>();
  const [patientCases, setPatientCases] = useState<Case[]>([]);
  const [xrayImage, setXrayImage] = useState<XRayImage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Diagnosis state
  const [newDiagnosisName, setNewDiagnosisName] = useState('');
  const [newDiagnosisConfidence, setNewDiagnosisConfidence] = useState(50);
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);
  const [diagnosisToDelete, setDiagnosisToDelete] = useState<Diagnosis | null>(null);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null);
  const [pendingBoundingBox, setPendingBoundingBox] = useState<BoundingBox | null>(null);

  // Notes state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const [generatingReport, setGeneratingReport] = useState(false);

  const [gradcamMode, setGradcamMode] = useState<string>('normal');
  const [gradcamCanvases, setGradcamCanvases] = useState<{ [key: string]: HTMLCanvasElement }>({});
  const [loadingGradcam, setLoadingGradcam] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientData, caseData, patientCases, xrayData] = await Promise.all([
          getPatientById(patientId!),
          getCaseById(caseId!),
          getPatientCases(patientId!),
          getPatientXRayImages(patientId!)
        ]);

        setPatient(patientData!);
        setCurrentCase(caseData!);
        setPatientCases(patientCases || []);

        const currentXray = xrayData?.find(xray => xray.caseId === caseId) || xrayData?.[0];
        setXrayImage(currentXray);

      } catch (err) {
        setError('Failed to load case data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId, caseId]);

  const saveCase = async (updatedCase: Partial<Case>) => {
    if (!currentCase) return;

    setSaving(true);
    try {
      await updateCase(currentCase.id!, updatedCase);
      setCurrentCase({ ...currentCase, ...updatedCase });
    } catch (error) {
      console.error('Failed to save case:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartAddingDiagnosis = () => {
    setPendingBoundingBox(null);
    setSelectedBoundingBox(null);
    setNewDiagnosisName('');
    setNewDiagnosisConfidence(50);

    xrayCanvasRef.current?.startDrawing();
  };

  const handleBoundingBoxCreated = (bbox: BoundingBox) => {
    setPendingBoundingBox(bbox);
    setSelectedBoundingBox(bbox);
    setShowAddDiagnosis(true);

    xrayCanvasRef.current?.cancelDrawing();
  };

  const handleAddDiagnosis = async () => {
    if (!newDiagnosisName.trim() || !currentCase || !pendingBoundingBox) return;

    const newDiagnosis: Diagnosis = {
      name: newDiagnosisName.trim(),
      confidence: newDiagnosisConfidence,
      boundingBox: pendingBoundingBox
    };

    const updatedDiagnoses = [...(currentCase.diagnosis || []), newDiagnosis];
    await saveCase({ diagnosis: updatedDiagnoses });

    setNewDiagnosisName('');
    setNewDiagnosisConfidence(50);
    setShowAddDiagnosis(false);
    setPendingBoundingBox(null);
    setSelectedBoundingBox(null);
  };

  const handleCancelAddDiagnosis = () => {
    setShowAddDiagnosis(false);
    setNewDiagnosisName('');
    setNewDiagnosisConfidence(50);
    setPendingBoundingBox(null);
    setSelectedBoundingBox(null);
    xrayCanvasRef.current?.cancelDrawing();
  };

  const handleDeleteDiagnosis = async () => {
    if (!diagnosisToDelete || !currentCase) return;

    const updatedDiagnoses = currentCase.diagnosis?.filter(d =>
      !(d.name === diagnosisToDelete.name && d.confidence === diagnosisToDelete.confidence)
    ) || [];

    await saveCase({ diagnosis: updatedDiagnoses });
    setDiagnosisToDelete(null);
  };

  const handleDiagnosisClick = (diagnosis: Diagnosis) => {
    if (diagnosis.boundingBox) {
      setSelectedBoundingBox(diagnosis.boundingBox);
    }
  };

  const handleBoundingBoxSelected = (bbox: BoundingBox | null) => {
    setSelectedBoundingBox(bbox);
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !currentCase) return;

    const newNote: Note = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: new Date()
    };

    const updatedNotes = [...(currentCase.notes || []), newNote];
    await saveCase({ notes: updatedNotes });

    setNewNoteText('');
    setShowAddNote(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNewNoteText(note.text);
  };

  const handleSaveNote = async () => {
    if (!editingNote || !currentCase) return;

    const updatedNotes = currentCase.notes?.map(n =>
      n.id === editingNote.id
        ? { ...n, text: newNoteText.trim(), updatedAt: new Date() }
        : n
    ) || [];

    await saveCase({ notes: updatedNotes });
    setEditingNote(null);
    setNewNoteText('');
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete || !currentCase) return;

    const updatedNotes = currentCase.notes?.filter(n => n.id !== noteToDelete.id) || [];
    await saveCase({ notes: updatedNotes });
    setNoteToDelete(null);
  };

  const handleCaseSelect = (selectedCaseId: string) => {
    navigate(`/patients/${patientId}/cases/${selectedCaseId}`);
  };


  const handleDownloadReport = async () => {
    if (!currentCase || !patient) return;
    
    try {
      setGeneratingReport(true);
      
      // Get the canvas element if it exists (for annotations)
      const canvasElement = document.querySelector('canvas') as HTMLCanvasElement;
      
      const reportData = {
        case: currentCase,
        patient: patient,
        xrayImage: xrayImage,
        xrayImageUrl: xrayImage?.imageUrl
      };
      
      if (canvasElement && currentCase.diagnosis?.some(d => d.boundingBox)) {
        // Generate report with annotations
        await ReportService.generateReportWithAnnotations(reportData, canvasElement);
      } else {
        // Generate regular report
        await ReportService.generateCaseReport(reportData);
      }
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      // You might want to show an error toast/alert here
    } finally {
      setGeneratingReport(false);
    }
  };

  // Replace the handleGenerateGradCAM function with this:
const handleGenerateGradCAM = async (diagnosis: Diagnosis) => {
  if (!diagnosis.name) return;
  
  const diagnosisKey = `gradcam_${diagnosis.name}`;
  
  // Check if already loaded
  if (gradcamCanvases[diagnosisKey]) {
    setGradcamMode(diagnosisKey);
    return;
  }
  
  // Check if we have stored Grad-CAM data
  if (diagnosis.gradcamData) {
    try {
      setLoadingGradcam(diagnosis.name);
      
      // Create canvas from stored base64 data
      const canvas = await createCanvasFromBase64(diagnosis.gradcamData);
      
      setGradcamCanvases(prev => ({
        ...prev,
        [diagnosisKey]: canvas
      }));
      
      setGradcamMode(diagnosisKey);
      console.log(`Loaded stored Grad-CAM for ${diagnosis.name}`);
      
    } catch (error) {
      console.error('Failed to load stored Grad-CAM:', error);
      // Fall back to generating new one
      await generateNewGradCAM(diagnosis);
    } finally {
      setLoadingGradcam(null);
    }
  } else {
    // Generate new Grad-CAM (existing logic)
    await generateNewGradCAM(diagnosis);
  }
};

const createCanvasFromBase64 = (base64Data: string): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load stored Grad-CAM'));
    img.src = base64Data;
  });
};

const generateNewGradCAM = async (diagnosis: Diagnosis) => {
  if (!xrayImage || !xrayCanvasRef.current) return;
}

  const renderDiagnosisTab = () => (
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Diagnosis Tab Header with Add Button */}
    {!showAddDiagnosis && (
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Diagnoses ({currentCase?.diagnosis?.length || 0})
          </Typography>
          <AppButton
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleStartAddingDiagnosis}
            disabled={showAddDiagnosis || !xrayImage}
          >
            Add Diagnosis
          </AppButton>
        </Box>
      </Box>
    )}

    {/* Add Diagnosis Form */}
    {showAddDiagnosis && pendingBoundingBox && (
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ 
          p: 2, 
          border: '1px solid', 
          borderColor: 'primary.main',
          borderRadius: 1,
          bgcolor: 'rgba(63, 136, 242, 0.02)'
        }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
            New Diagnosis
          </Typography>
          
          <TextField
            label="Diagnosis Name"
            value={newDiagnosisName}
            onChange={(e) => setNewDiagnosisName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            autoFocus
            placeholder="e.g. Pneumonia, Fracture..."
          />
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Confidence: {newDiagnosisConfidence}%
          </Typography>
          <Slider
            value={newDiagnosisConfidence}
            onChange={(_, value) => setNewDiagnosisConfidence(value as number)}
            min={0}
            max={100}
            step={5}
            size="small"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <AppButton 
              size="small" 
              onClick={handleAddDiagnosis} 
              loading={saving} 
              disabled={!newDiagnosisName.trim()}
              variant="contained"
            >
              Save
            </AppButton>
            <AppButton 
              size="small" 
              onClick={handleCancelAddDiagnosis}
              variant="outlined"
            >
              Cancel
            </AppButton>
          </Box>
        </Box>
      </Box>
    )}

    {/* Diagnosis List */}
    <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
      {currentCase?.diagnosis?.length ? (
        <List sx={{ p: 0 }}>
          {currentCase.diagnosis.map((diagnosis, index) => (
            <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                onClick={() => handleDiagnosisClick(diagnosis)}
                selected={selectedBoundingBox === diagnosis.boundingBox}
                sx={{ 
                  borderRadius: 1,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(63, 136, 242, 0.08)',
                    '&:hover': {
                      bgcolor: 'rgba(63, 136, 242, 0.12)'
                    }
                  },
                  '&:hover': {
                    bgcolor: selectedBoundingBox === diagnosis.boundingBox 
                      ? 'rgba(63, 136, 242, 0.12)' 
                      : 'action.hover'
                  }
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: selectedBoundingBox === diagnosis.boundingBox ? 600 : 400,
                        lineHeight: 1.3,
                        flex: 1
                      }}
                      noWrap
                    >
                      {diagnosis.name}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiagnosisToDelete(diagnosis);
                      }}
                      disabled={showAddDiagnosis}
                      sx={{ 
                        ml: 1,
                        color: 'text.secondary',
                        '&:hover': { 
                          color: 'error.main',
                          bgcolor: 'rgba(211, 47, 47, 0.04)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${diagnosis.confidence}%`}
                      size="small"
                      color={diagnosis.confidence > 70 ? 'success' : diagnosis.confidence > 40 ? 'warning' : 'error'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.6875rem' }}
                    />
                    {diagnosis.boundingBox && (
                      <Chip 
                        label="Annotated"
                        size="small"
                        color="primary"
                        variant="filled"
                        sx={{ height: 20, fontSize: '0.6875rem' }}
                      />
                    )}
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : !showAddDiagnosis ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No diagnoses yet
          </Typography>
          <AppButton 
            variant="contained" 
            onClick={handleStartAddingDiagnosis}
            startIcon={<AddIcon />}
            size="small"
            disabled={!xrayImage}
          >
            Add First Diagnosis
          </AppButton>
        </Box>
      ) : null}
    </Box>
    </Box>
  );

const renderNotesTab = () => (
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Add Note Form */}
    {showAddNote && (
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ 
          p: 2, 
          border: '1px solid', 
          borderColor: 'primary.main',
          borderRadius: 1,
          bgcolor: 'rgba(63, 136, 242, 0.02)'
        }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
            New Note
          </Typography>
          <TextField
            label="Note"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            fullWidth
            multiline
            rows={3}
            autoFocus
            placeholder="Add your observations..."
            size="small"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <AppButton 
              size="small" 
              onClick={handleAddNote}
              loading={saving}
              disabled={!newNoteText.trim()}
              variant="contained"
            >
              Save
            </AppButton>
            <AppButton 
              size="small" 
              onClick={() => {
                setShowAddNote(false);
                setNewNoteText('');
              }}
              variant="outlined"
            >
              Cancel
            </AppButton>
          </Box>
        </Box>
      </Box>
    )}

    {/* Notes List */}
    <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
      {currentCase?.notes?.length ? (
        <List sx={{ p: 0 }}>
          {currentCase.notes.map((note) => (
            <ListItem key={note.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                sx={{ 
                  borderRadius: 1,
                  display: 'block',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Box sx={{ width: '100%' }}>
                  {editingNote?.id === note.id ? (
                    <Box>
                      <TextField
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        autoFocus
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <AppButton 
                          size="small" 
                          onClick={handleSaveNote}
                          loading={saving}
                          disabled={!newNoteText.trim()}
                          variant="contained"
                        >
                          Save
                        </AppButton>
                        <AppButton 
                          size="small" 
                          onClick={() => {
                            setEditingNote(null);
                            setNewNoteText('');
                          }}
                          variant="outlined"
                        >
                          Cancel
                        </AppButton>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            lineHeight: 1.4,
                            flex: 1,
                            mr: 1
                          }}
                        >
                          {note.text}
                        </Typography>
                        <Box sx={{ display: 'flex', ml: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNote(note);
                            }}
                            disabled={editingNote !== null || showAddNote}
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': { color: 'primary.main' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteToDelete(note);
                            }}
                            disabled={editingNote !== null || showAddNote}
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': { 
                                color: 'error.main',
                                bgcolor: 'rgba(211, 47, 47, 0.04)'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : !showAddNote ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No notes yet
          </Typography>
          <AppButton 
            variant="contained" 
            onClick={() => setShowAddNote(true)}
            startIcon={<AddIcon />}
            size="small"
          >
            Add First Note
          </AppButton>
        </Box>
      ) : null}
    </Box>
  </Box>
);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !currentCase) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Could not load case data'}
        </Alert>
        <AppButton variant="outlined" onClick={() => navigate(`/patients/${patientId}`)}>
          Back to Patient
        </AppButton>
      </Box>
    );
  }

  const tabs: TabItem[] = [
    { label: 'Diagnosis', content: renderDiagnosisTab() },
    { label: 'Notes', content: renderNotesTab() }
  ];

  return (
    <>
      <AppBar position="fixed" elevation={0}>
        <Toolbar>
          <IconButton 
            color="inherit" 
            onClick={() => navigate(`/patients/${patientId}`)} 
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            {patient?.firstName} {patient?.lastName} - Cases
          </Typography>
          
          {/* Download Report Button - Now on the right */}
          <AppButton
            variant="outlined"
            color="inherit"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
            loading={generatingReport}
            disabled={!currentCase || !patient}
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.23)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                bgcolor: 'rgba(255, 255, 255, 0.04)'
              }
            }}
          >
            {generatingReport ? 'Generating...' : 'Download Report'}
          </AppButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: 10, px: 1, height: '100vh', overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }} spacing={2}>
          {/*** Left Sidebar: Cases List ***/}
          <Grid item md={3} sx={{ height: '100%' }}>
            <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ p: 3, height: '13%', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Patient Cases
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {patientCases.length} case{patientCases.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {patientCases.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No cases available
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {patientCases.map((patientCase) => (
                      <ListItem key={patientCase.id} disablePadding>
                        <ListItemButton
                          onClick={() => handleCaseSelect(patientCase.id!)}
                          selected={patientCase.id === caseId}
                          sx={{ borderRadius: 2 }}
                        >
                          <ListItemText
                            primary={patientCase.title}
                            secondary={
                              patientCase.createdAt
                                ? format(patientCase.createdAt, 'MMM d, yyyy')
                                : 'No date'
                            }
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: patientCase.id === caseId ? 600 : 400,
                              noWrap: true
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          {/*** Center: X-Ray Image ***/}
          <Grid item md={6} sx={{ height: '100%' }}>
            <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ p: 3, height: '13%', borderBottom: 1, borderColor: 'divider' }}>
                <Grid container>
                  <Grid item xs={4}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textTransform: 'uppercase', fontWeight: 500 }}
                    >
                      Created
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {currentCase.createdAt
                        ? format(currentCase.createdAt, 'MMM d, yyyy')
                        : 'Not available'}
                    </Typography>
                  </Grid>

                  <Grid item xs={4}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textTransform: 'uppercase', fontWeight: 500 }}
                    >
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                      {currentCase.description || 'Not specified'}
                    </Typography>
                  </Grid>

                  {xrayImage && (
                    <Grid item xs={4}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', fontWeight: 500 }}
                      >
                        X-Ray Date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {format(xrayImage.takenAt, 'MMM d')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

<Box
  sx={{
    flex: 1,
    position: 'relative',
    bgcolor: 'black',
    borderRadius: '0 0 12px 12px',
    overflow: 'hidden'
  }}
>
  {/* Grad-CAM Mode Selector */}
  <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, minWidth: 200 }}>
    <FormControl size="small" fullWidth>
      <InputLabel sx={{ color: 'white' }}>View Mode</InputLabel>
      <Select
        value={gradcamMode}
        onChange={(e) => setGradcamMode(e.target.value)}
        label="View Mode"
        sx={{
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
          '& .MuiSvgIcon-root': { color: 'white' }
        }}
      >
        <MenuItem value="normal">Normal View</MenuItem>
        {currentCase?.diagnosis?.map((diagnosis, index) => {
          const diagnosisKey = `gradcam_${diagnosis.name}`;
          const isLoading = loadingGradcam === diagnosis.name;
          
          return (
            <MenuItem 
              key={index} 
              value={diagnosisKey}
              onClick={() => !isLoading && handleGenerateGradCAM(diagnosis)}
            >
              Grad-CAM: {diagnosis.name}
              {isLoading && ' (Loading...)'}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  </Box>

  {/* Render Canvas */}
  {gradcamMode === 'normal' ? (
    <XRayCanvas
      ref={xrayCanvasRef}
      imageUrl={xrayImage?.imageUrl}
      boundingBoxes={currentCase?.diagnosis?.map(d => d.boundingBox).filter(Boolean) as BoundingBox[] || []}
      selectedBoundingBox={selectedBoundingBox}
      onBoundingBoxCreated={handleBoundingBoxCreated}
      onBoundingBoxSelected={handleBoundingBoxSelected}
      style={{ width: '100%', height: '100%', borderRadius: '0 0 12px 12px' }}
    />
  ) : gradcamCanvases[gradcamMode] ? (
    <canvas
      ref={(canvas) => {
        if (canvas && gradcamCanvases[gradcamMode]) {
          const ctx = canvas.getContext('2d')!;
          canvas.width = gradcamCanvases[gradcamMode].width;
          canvas.height = gradcamCanvases[gradcamMode].height;
          ctx.drawImage(gradcamCanvases[gradcamMode], 0, 0);
        }
      }}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  ) : (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
      <CircularProgress sx={{ mr: 2 }} />
      <Typography>Generating Grad-CAM...</Typography>
    </Box>
  )}
</Box>
            </Paper>
          </Grid>

          {/*** Right Side: Tabbed Panel ***/}
          <Grid item md={3} sx={{ height: '100%' }}>
            <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <TabsContainer tabs={tabs} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={diagnosisToDelete !== null}
        title="Delete Diagnosis"
        message="Are you sure you want to delete this diagnosis?"
        onConfirm={handleDeleteDiagnosis}
        onCancel={() => setDiagnosisToDelete(null)}
        loading={saving}
      />

      <ConfirmationDialog
        open={noteToDelete !== null}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        onConfirm={handleDeleteNote}
        onCancel={() => setNoteToDelete(null)}
        loading={saving}
      />
    </>
  );
};

export default CaseDetails;
