import {useState} from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Alert,
  Divider,
  Paper,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { addCase } from '../../services/CasesService';
import { addXRayImage } from '../../services/XRayService';
import { Case } from '../../types/Case';
import AppButton from '../common/AppButton';
import ImageUpload from '../common/ImageUpload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { generateTeethForCase } from '@/services/TeethService';
import ModelService from '../../services/ModelService';

interface CaseFormProps {
  patientId: string;
  onSubmitSuccess: (caseId: string) => void;
}

const CaseForm = ({ patientId, onSubmitSuccess }: CaseFormProps) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [xrayFile, setXrayFile] = useState<File | null>(null);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');

  // Chest X-ray Classification states
  const [classificationResults, setClassificationResults] = useState<{label: string, probability: number}[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  // Add these to your existing state variables in CaseForm.tsx
  const [gradCAMImage, setGradCAMImage] = useState<string | null>(null);
  const [generatingGradCAM, setGeneratingGradCAM] = useState(false);
  const [gradCAMError, setGradCAMError] = useState<string | null>(null);

  // Handle chest X-ray classification
  const handleClassifyImage = async (imageElement: HTMLImageElement) => {
    try {
      setClassifying(true);
      setClassificationError(null);
      setGradCAMImage(null);
      setGradCAMError(null);
      
      console.log('Starting chest X-ray classification...');
      const results = await ModelService.classifyImage(imageElement);
      
      setClassificationResults(results);
      console.log('Classification results:', results);
      
      // Auto-fill diagnosis with top predictions (only if diagnosis is empty)
      const topPredictions = results
        .filter(r => r.probability > 0.3) // Only confident predictions
        .slice(0, 3) // Top 3
        .map(r => `${r.label} (${(r.probability * 100).toFixed(1)}%)`)
        .join(', ');
      
      if (topPredictions && !diagnosis.trim()) {
        setDiagnosis(`AI Suggestion: ${topPredictions}`);
      }
      
      // Generate Grad-CAM for top prediction
      if (results.length > 0) {
        setGeneratingGradCAM(true);
        try {
          console.log('Generating Grad-CAM visualization...');
          const topClassIndex = results.findIndex(r => r.probability === Math.max(...results.map(r => r.probability)));
          const gradCAMCanvas = await ModelService.generateGradCAM(imageElement, topClassIndex);
          const overlayCanvas = await ModelService.overlayGradCAM(imageElement, gradCAMCanvas);
          setGradCAMImage(overlayCanvas.toDataURL());
          console.log('Grad-CAM generated successfully');
        } catch (gradCAMError) {
          console.error('Grad-CAM generation failed:', gradCAMError);
          setGradCAMError('Failed to generate visualization. This feature may not be available for this model.');
        } finally {
          setGeneratingGradCAM(false);
        }
      }
      
    } catch (error) {
      console.error('Classification failed:', error);
      setClassificationError('Failed to classify image. Please try again.');
    } finally {
      setClassifying(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    setTitleError('');

    if (!title.trim()) {
      setTitleError('Case title is required');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const caseData: Omit<Case, 'id'> = {
        title,
        description,
        diagnosis,
        patientId,
        createdAt: new Date(),
      };

      const caseId = await addCase(caseData);

      if (xrayFile) {
        const xrayData = {
          patientId,
          caseId,
          takenAt: new Date(),
        };
        await addXRayImage(xrayFile, xrayData);
      }

      await generateTeethForCase(patientId, caseId);

      onSubmitSuccess(caseId);

    } catch (err) {
      console.error('Error creating case:', err);
      setError('Failed to create case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setXrayFile(file);
    setClassificationResults([]);
    setClassificationError(null);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => handleClassifyImage(img);
        // @ts-ignore
        img.src = e.target.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReclassify = async () => {
    if (!xrayFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => handleClassifyImage(img);
      // @ts-ignore
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(xrayFile);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} padding={3}>
        {/* Case Information Section */}        
        <Grid item xs={12} md={6}>
          <TextField
            label="Case Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            error={!!titleError}
            helperText={titleError}
            disabled={loading}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Initial Diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            fullWidth
            disabled={loading}
            helperText="AI suggestions will appear here automatically, but you can modify or replace them"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={loading}
          />
        </Grid>
        
        {/* X-Ray Upload Section */}
        <Grid item xs={12}>
          <ImageUpload
            onFileSelect={handleFileSelect}
            acceptedFileTypes="image/*"
            maxSizeMB={12}
            disabled={loading}
          />
        </Grid>

        {/* AI Classification Results */}
        {(classificationResults.length > 0 || classifying || classificationError) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  AI Classification Results
                </Typography>
                {classifying && <CircularProgress size={20} />}
                {xrayFile && !classifying && (
                  <AppButton
                    variant="outlined"
                    size="small"
                    onClick={handleReclassify}
                    startIcon={<SmartToyIcon />}
                  >
                    Re-analyze
                  </AppButton>
                )}
              </Box>
              
              {classificationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {classificationError}
                </Alert>
              )}
              
              {classifying && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Analyzing chest X-ray for pathologies...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
              
              {classificationResults.length > 0 && (
                <>
                  <Grid container spacing={1}>
                    {classificationResults
                      .filter(result => result.probability > 0.1) // Show only meaningful predictions
                      .slice(0, 6) // Top 6 results
                      .map((result) => (
                        <Grid item xs={12} sm={6} md={4} key={result.label}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: 1, 
                            borderColor: result.probability > 0.5 ? 'warning.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: result.probability > 0.5 ? 'warning.light' : 'background.paper',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: 2
                            }
                          }}>
                            <Typography variant="body2" fontWeight="bold">
                              {result.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Confidence: {(result.probability * 100).toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={result.probability * 100}
                              sx={{ 
                                mt: 0.5, 
                                height: 4,
                                borderRadius: 2
                              }}
                              color={result.probability > 0.5 ? "warning" : "primary"}
                            />
                          </Box>
                        </Grid>
                      ))}
                  </Grid>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      💡 <strong>AI Analysis Complete:</strong> High confidence predictions (&gt;50%) are highlighted. 
                      These are AI suggestions to assist diagnosis - please verify with clinical expertise.
                    </Typography>
                  </Alert>
                </>
              )}
            </Paper>
          </Grid>
        )}

        {/* Add this after your AI Classification Results section */}
        {(gradCAMImage || generatingGradCAM || gradCAMError) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 24, 
                  height: 24, 
                  background: 'linear-gradient(45deg, #ff0000, #ffff00)',
                  borderRadius: '4px',
                  mr: 1 
                }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Grad-CAM Visualization
                </Typography>
                {generatingGradCAM && <CircularProgress size={20} />}
              </Box>
              
              {gradCAMError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {gradCAMError}
                </Alert>
              )}
              
              {generatingGradCAM && !gradCAMImage && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Generating attention heatmap...
                  </Typography>
                </Box>
              )}
              
              {gradCAMImage && (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ 
                    display: 'inline-block',
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 2
                  }}>
                    <img 
                      src={gradCAMImage} 
                      alt="Grad-CAM Heatmap Overlay"
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto',
                        display: 'block'
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                    🔥 <strong>Red/yellow areas</strong> indicate regions the AI focused on for the top prediction<br/>
                    This helps understand what the model "sees" when making its diagnosis
                  </Typography>
                  
                  {classificationResults.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                      <Typography variant="body2">
                        <strong>Visualization for:</strong> {classificationResults[0].label} 
                        ({(classificationResults[0].probability * 100).toFixed(1)}% confidence)
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Submit Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <AppButton
              type="submit"
              variant="contained"
              color="primary"
              loading={loading}
              disabled={!title.trim()}
              startIcon={<CloudUploadIcon />}
            >
              Create Case
            </AppButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CaseForm;