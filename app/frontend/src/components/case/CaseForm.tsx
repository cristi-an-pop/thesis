import { useState } from 'react';
import { Box, TextField, Grid, Alert, Paper, LinearProgress, Chip } from '@mui/material';
import { format } from 'date-fns';
import { addCase } from '../../services/CasesService';
import { addXRayImage } from '../../services/XRayService';
import ModelService from '../../services/ModelService';
import AppButton from '../common/AppButton';
import ImageUpload from '../common/ImageUpload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GradCAMService from '../../services/GradCAMService';

interface CaseFormProps {
  patientId: string;
  onSubmitSuccess: (caseId: string) => void;
}

const CaseForm = ({ patientId, onSubmitSuccess }: CaseFormProps) => {
  const [description, setDescription] = useState('');
  const [xrayFile, setXrayFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [classifying, setClassifying] = useState(false);
  const [aiPredictions, setAiPredictions] = useState<{label: string, probability: number}[]>([]);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  const [generatingGradcams, setGeneratingGradcams] = useState(false);
  const [gradcamResults, setGradcamResults] = useState<{[diagnosis: string]: string}>({});

  const generateTitle = () => {
    const now = new Date();
    return format(now, 'MMM d, yyyy - HH:mm');
  };

  const handleFileSelect = async (file: File | null) => {
    setXrayFile(file);
    setAiPredictions([]);
    setClassificationError(null);
    setGradcamResults({});
    
    if (file && ModelService.isModelReady()) {
      try {
        setClassifying(true);
        console.log('Auto-classifying uploaded image...');
        
        const predictions = await ModelService.classifyImageFile(file);
        setAiPredictions(predictions);
        
        if (predictions.length > 0) {
        setGeneratingGradcams(true);
        const gradcams: {[diagnosis: string]: string} = {};
        
        // Create image element from file
        const img = await createImageFromFile(file);
        
        for (const prediction of predictions) {
          try {
            console.log(`Generating Grad-CAM for ${prediction.label}...`);
            const result = await GradCAMService.generateGradCAM(img, prediction.label);
            
            // Convert canvas to base64 for storage
            gradcams[prediction.label] = result.overlayCanvas.toDataURL('image/png');
            
            console.log(`Grad-CAM generated for ${prediction.label}`);
          } catch (error) {
            console.error(`Failed to generate Grad-CAM for ${prediction.label}:`, error);
          }
        }
        
        setGradcamResults(gradcams);
        setGeneratingGradcams(false);
      }
        
      } catch (err) {
        console.error('Classification failed:', err);
        setClassificationError('AI classification failed - you can still create the case manually');
      } finally {
        setClassifying(false);
      }
    }
  };

  const createImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!xrayFile) {
      setError('X-Ray image is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const title = generateTitle();

      const aiDiagnoses = aiPredictions.map(prediction => ({
        name: prediction.label,
        confidence: Math.round(prediction.probability * 100),
        gradcamData: gradcamResults[prediction.label]
      }));

      const caseId = await addCase({
        title,
        description: description.trim() || undefined,
        diagnosis: aiDiagnoses,
        patientId
      });
      
      await addXRayImage(xrayFile, {
        patientId,
        caseId,
        takenAt: new Date(),
      });

      onSubmitSuccess(caseId);

    } catch (err) {
      setError('Failed to create case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {classificationError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {classificationError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>

          <Grid item xs={12}>
            <TextField
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              placeholder="Add any additional notes or observations..."
              helperText="Optional: Describe the case, symptoms, or other relevant information"
            />
          </Grid>

          <Grid item xs={12}>
            <ImageUpload
              onFileSelect={handleFileSelect}
              acceptedFileTypes="image/*"
              maxSizeMB={12}
              disabled={loading}
            />
            
            {(classifying || generatingGradcams) && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <span>
                    {classifying && 'AI is analyzing the X-ray...'}
                    {generatingGradcams && 'Generating AI visualizations...'}
                  </span>
                </Box>
                <LinearProgress />
              </Box>
            )}
            
            {aiPredictions.length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Box>
                  <strong>AI Analysis Complete:</strong>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {aiPredictions.map((prediction, index) => (
                      <Chip 
                        key={index}
                        label={`${prediction.label} (${Math.round(prediction.probability * 100)}%)`}
                        color={index === 0 ? 'primary' : 'default'}
                        variant={index === 0 ? 'filled' : 'outlined'}
                        size="small"
                        icon={gradcamResults[prediction.label] ? <PsychologyIcon /> : undefined}
                      />
                    ))}
                  </Box>
                  <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                    Diagnoses and AI visualizations will be automatically added to the case
                    {Object.keys(gradcamResults).length > 0 && 
                      ` (${Object.keys(gradcamResults).length} Grad-CAM${Object.keys(gradcamResults).length !== 1 ? 's' : ''} generated)`
                    }
                  </Box>
                </Box>
              </Alert>
            )}
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <AppButton
                type="submit"
                variant="contained"
                loading={loading}
                disabled={!xrayFile || classifying}
                startIcon={<CloudUploadIcon />}
              >
                {aiPredictions.length > 0 ? 'Create Case with AI Diagnosis' : 'Create Case'}
              </AppButton>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CaseForm;