import { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  Button,
  AppBar,
  Toolbar
} from '@mui/material';
import { format } from 'date-fns';
import { getPatientById } from '../../services/PatientsService';
import { getCaseById, getPatientCases, updateCase } from '../../services/CasesService';
import { getPatientXRayImages } from '../../services/XRayService';
import { Case } from '../../types/Case';
import { XRayImage } from '../../types/XRayImage';
import XRayCanvas, { BoundingBox, XRayCanvasRef } from '../../components/case/XRayCanvas';
import AppButton from '../../components/common/AppButton';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

interface Note {
  id: string;
  text: string;
  diagnosis?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const CaseDetails = () => {
  const { patientId, caseId } = useParams<{ patientId: string; caseId: string }>();
  const navigate = useNavigate();
  
  // State for patient and case data
  const [patient, setPatient] = useState<any>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [patientCases, setPatientCases] = useState<Case[]>([]);
  const [currentXRay, setCurrentXRay] = useState<XRayImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for notes and bounding boxes
  const xrayCanvasRef = useRef<XRayCanvasRef>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  
  const [savingChanges, setSavingChanges] = useState(false);
  
  // Dialog states
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<Note | null>(null);
  const [confirmDeleteBBox, setConfirmDeleteBBox] = useState<BoundingBox | null>(null);
  
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
        
        if (caseData.notes) {
          setNotes(caseData.notes);
        }
        
        if (caseData.boundingBoxes) {
          setBoundingBoxes(caseData.boundingBoxes);
        }
        
        const casesData = await getPatientCases(patientId);
        setPatientCases(casesData || []);
        
        const xrayData = await getPatientXRayImages(patientId);
        if (xrayData && xrayData.length > 0) {
          setCurrentXRay(xrayData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching case data:', err);
        setError('Failed to load case data');
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

  const handleBoundingBoxCreated = (bbox: Omit<BoundingBox, 'id'>) => {
    // Create a new note for this bounding box
    const newNote: Note = {
      id: `note-${Date.now()}`,
      text: 'New annotation area',
      createdAt: new Date()
    };
    
    const newBBox: BoundingBox = {
      ...bbox,
      id: `bbox-${Date.now()}`,
      noteId: newNote.id
    };
    
    // Update state
    setNotes([...notes, newNote]);
    setBoundingBoxes([...boundingBoxes, newBBox]);
    setSelectedBoundingBox(newBBox);
    setSelectedNote(newNote);
    setActiveTab(1); // Switch to bounding box tab
    
    // Switch to edit mode for the new note
    setEditingNote(newNote);
    setNoteText(newNote.text);
  };

  const handleBoundingBoxSelected = (bbox: BoundingBox | null) => {
    setSelectedBoundingBox(bbox);
    
    if (bbox) {
      // Find the associated note
      const note = notes.find(n => n.id === bbox.noteId);
      if (note) {
        setSelectedNote(note);
        setActiveTab(1); // Switch to bounding box tab
      }
    }
  };
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleAddNote = () => {
    setEditingNote({
      id: `temp-${Date.now()}`,
      text: '',
      createdAt: new Date()
    });
    setNoteText('');
  };
  
  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.text);
  };
  
  const handleSaveNote = async () => {
    if (!editingNote || !currentCase || !currentCase.id) return;
    
    try {
      setSavingChanges(true);
      
    const updatedNotes = editingNote.id.startsWith('temp-')
    ? [...notes, { 
        ...editingNote, 
        id: `note-${Date.now()}`, 
        text: noteText,
        // Keep diagnosis from editingNote
        }]
    : notes.map(n => n.id === editingNote.id ? { 
        ...n, 
        text: noteText, 
        // Keep diagnosis from editingNote
        updatedAt: new Date() 
        } : n);
      
      setNotes(updatedNotes);
      
      // Update case with new notes
      const updatedCase = {
        ...currentCase,
        notes: updatedNotes
      };
      
      await updateCase(currentCase.id, updatedCase);
      setCurrentCase(updatedCase);
      
      setEditingNote(null);
      setNoteText('');
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingChanges(false);
    }
  };
  
  const handleCancelEditNote = () => {
    setEditingNote(null);
    setNoteText('');
  };
  
  const handleConfirmDeleteNote = (note: Note) => {
    setConfirmDeleteNote(note);
  };
  
  const handleDeleteNote = async () => {
    if (!confirmDeleteNote || !currentCase || !currentCase.id) return;
    
    try {
      setSavingChanges(true);
      
      // Filter out deleted note
      const updatedNotes = notes.filter(n => n.id !== confirmDeleteNote.id);
      setNotes(updatedNotes);
      
      // Also delete any bounding box associated with this note
      const updatedBBoxes = boundingBoxes.filter(bbox => bbox.noteId !== confirmDeleteNote.id);
      setBoundingBoxes(updatedBBoxes);
      
      // Update case with changes
      const updatedCase = {
        ...currentCase,
        notes: updatedNotes,
        boundingBoxes: updatedBBoxes
      };
      
      await updateCase(currentCase.id, updatedCase);
      setCurrentCase(updatedCase);
      
      setConfirmDeleteNote(null);
    } catch (err) {
      console.error('Error deleting note:', err);
    } finally {
      setSavingChanges(false);
    }
  };
  
  const handleCancelDeleteNote = () => {
    setConfirmDeleteNote(null);
  };
  
  const handleConfirmDeleteBBox = (bbox: BoundingBox) => {
    setConfirmDeleteBBox(bbox);
  };
  
  const handleDeleteBBox = async () => {
    if (!confirmDeleteBBox || !currentCase || !currentCase.id) return;
    
    try {
      setSavingChanges(true);
      
      // Filter out deleted bbox
      const updatedBBoxes = boundingBoxes.filter(b => b.id !== confirmDeleteBBox.id);
      setBoundingBoxes(updatedBBoxes);
      
      // Update case with changes
      const updatedCase = {
        ...currentCase,
        boundingBoxes: updatedBBoxes
      };
      
      await updateCase(currentCase.id, updatedCase);
      setCurrentCase(updatedCase);
      
      setConfirmDeleteBBox(null);
      
      // Deselect the bbox if it was selected
      if (selectedBoundingBox && selectedBoundingBox.id === confirmDeleteBBox.id) {
        setSelectedBoundingBox(null);
      }
    } catch (err) {
      console.error('Error deleting bounding box:', err);
    } finally {
      setSavingChanges(false);
    }
  };
  
  const handleCancelDeleteBBox = () => {
    setConfirmDeleteBBox(null);
  };
  
  const handleSelectBBoxFromNote = (bbox: BoundingBox) => {
    setSelectedBoundingBox(bbox);
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
          {error || 'Could not load case data'}
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
          top: 64,
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
          
          {/* Center - X-Ray Canvas */}
          <Grid item xs={12} md={7} sx={{ height: '100%' }}>
              <Box sx={{ mb: 2, flex: 1, overflow: 'hidden' }}>
                <XRayCanvas
                  ref={xrayCanvasRef}
                  imageUrl={currentXRay?.imageUrl}
                  boundingBoxes={boundingBoxes}
                  selectedBoundingBox={selectedBoundingBox}
                  onBoundingBoxCreated={handleBoundingBoxCreated}
                  onBoundingBoxSelected={handleBoundingBoxSelected}
                  style={{ height: '100%' }}
                />
              </Box>
            
            {/* Case information */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {currentCase.title}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body2">
                    {currentCase.createdAt ? format(currentCase.createdAt, 'MMM d, yyyy') : 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Diagnosis:
                  </Typography>
                  <Typography variant="body2">
                    {currentCase.diagnosis || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Patient:
                  </Typography>
                  <Typography variant="body2">
                    {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Right sidebar - Case Notes and Annotations */}
          <Grid item xs={12} md={3} sx={{ height: '100%', borderLeft: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {activeTab === 0 ? 'Case Notes' : 'Bounding Box Annotations'}
                </Typography>
                {activeTab === 0 && !editingNote && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddNote}
                    size="small"
                  >
                    Add Note
                  </Button>
                )}
              </Box>
              
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Case Notes" />
                <Tab label="Annotations" disabled={boundingBoxes.length === 0} />
              </Tabs>
              
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {activeTab === 0 ? (
                  // Case Notes Tab
                  <>
                    {editingNote ? (
                      // Note edit form
                      <Box sx={{ mb: 2 }}>
                        {activeTab !== 0 && (
                            <TextField
                                label="Diagnosis"
                                value={editingNote.diagnosis || ''}
                                onChange={(e) => setEditingNote({...editingNote, diagnosis: e.target.value})}
                                fullWidth
                                sx={{ mb: 2 }}
                            />
                        )}
                        <TextField
                          label="Note"
                          multiline
                          rows={4}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            startIcon={<CancelIcon />}
                            onClick={handleCancelEditNote}
                            disabled={savingChanges}
                          >
                            Cancel
                          </Button>
                          <Button
                            startIcon={<SaveIcon />}
                            onClick={handleSaveNote}
                            variant="contained"
                            disabled={noteText.trim() === '' || savingChanges}
                          >
                            Save
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      // Notes list
                      notes.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center">
                          No notes available for this case
                        </Typography>
                      ) : (
                        notes.map(note => (
                          <Paper 
                            key={note.id} 
                            elevation={0} 
                            sx={{ 
                              p: 2, 
                              mb: 2, 
                              bgcolor: 'background.default',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                { note.createdAt ? note.createdAt.toString() : "Not available" }
                              </Typography>
                              <Box>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditNote(note)}
                                  sx={{ mr: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleConfirmDeleteNote(note)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {note.text}
                            </Typography>
                          </Paper>
                        ))
                      )
                    )}
                  </>
                ) : (
                  // Bounding Box Annotations Tab
                  boundingBoxes.map(bbox => {
                    const note = notes.find(n => n.id === bbox.noteId);
                    const isSelected = selectedBoundingBox && selectedBoundingBox.id === bbox.id;
                    
                    return (
                      <Paper 
                        key={bbox.id} 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          bgcolor: isSelected ? 'action.selected' : 'background.default',
                          border: 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSelectBBoxFromNote(bbox)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Annotation {bbox.id.split('-')[1]}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDeleteBBox(bbox);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        {note?.diagnosis && (
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            Diagnosis: {note.diagnosis}
                            </Typography>
                        )}
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note ? note.text : 'No note attached'}
                        </Typography>
                      </Paper>
                    );
                  })
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      {/* Delete Note Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDeleteNote !== null}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        onConfirm={handleDeleteNote}
        onCancel={handleCancelDeleteNote}
        loading={savingChanges}
      />
      
      {/* Delete Bounding Box Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDeleteBBox !== null}
        title="Delete Annotation"
        message="Are you sure you want to delete this annotation area?"
        onConfirm={handleDeleteBBox}
        onCancel={handleCancelDeleteBBox}
        loading={savingChanges}
      />
    </>
  );
};

export default CaseDetails;