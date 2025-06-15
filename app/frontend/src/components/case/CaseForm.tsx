import { useState } from 'react';
import { Box, TextField, Grid, Alert, Paper, LinearProgress, Chip } from '@mui/material';
import { format } from 'date-fns';
import { addCase } from '../../services/CasesService';
import { addXRayImage } from '../../services/XRayService';
import ModelService from '../../services/ModelService';
import AppButton from '../common/AppButton';
import ImageUpload from '../common/ImageUpload';
import GradCAMService from '../../services/GradCamService';
import { handleError } from '../../lib/ErrorHandler';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SmartToyIcon from '@mui/icons-material/SmartToy';

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

  const generateTitle = () => format(new Date(), 'MMM d, yyyy - HH:mm');

  const createImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const generateGradCAMs = async (predictions: {label: string, probability: number}[], file: File) => {
    try {
      setGeneratingGradcams(true);
      const gradcams: {[diagnosis: string]: string} = {};
      const img = await createImageFromFile(file);
      
      for (const prediction of predictions) {
        try {
          const result = await GradCAMService.generateGradCAM(img, prediction.label);
          gradcams[prediction.label] = result.overlayCanvas.toDataURL('image/png');
        } catch (error) {
          handleError(error, `Failed to generate Grad-CAM for ${prediction.label}`);
        }
      }
      
      setGradcamResults(gradcams);
    } catch (error) {
      handleError(error, 'Failed to generate Grad-CAMs');
    } finally {
      setGeneratingGradcams(false);
    }
  };

  const handleFileSelect = async (file: File | null) => {
    setXrayFile(file);
    setAiPredictions([]);
    setClassificationError(null);
    setGradcamResults({});
    
    if (file && ModelService.isModelReady()) {
      try {
        setClassifying(true);
        const predictions = await ModelService.classifyImageFile(file);
        setAiPredictions(predictions);
        
        if (predictions.length > 0) {
          await generateGradCAMs(predictions, file);
        }
        
      } catch (err) {
        handleError(err, 'AI classification failed');
        setClassificationError('AI classification failed - you can still create the case manually');
      } finally {
        setClassifying(false);
      }
    }
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

      const aiDiagnoses = aiPredictions.map(prediction => ({
        name: prediction.label,
        confidence: Math.round(prediction.probability * 100),
        gradcamData: gradcamResults[prediction.label]
      }));

      const caseId = await addCase({
        title: generateTitle(),
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
      handleError(err, 'Failed to create case');
      setError('Failed to create case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = classifying || generatingGradcams;

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
            
            {isProcessing && (
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
                      />
                    ))}
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
                disabled={!xrayFile || isProcessing}
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