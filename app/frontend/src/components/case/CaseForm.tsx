import {useEffect, useRef, useState} from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { addCase } from '../../services/CasesService';
import { addXRayImage } from '../../services/XRayService';
import { Case } from '../../types/Case';
import AppButton from '../common/AppButton';
import ImageUpload from '../common/ImageUpload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { generateTeethForCase } from '@/services/TeethService';

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import {detect} from "../../ml/detect";
import {segment} from "../../ml/segment";
tf.setBackend("webgl");

interface CaseFormProps {
  patientId: string;
  onSubmitSuccess: (caseId: string) => void;
}

const CaseForm = ({ patientId, onSubmitSuccess }: CaseFormProps) => {
  // @ts-ignore
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [xrayFile, setXrayFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');

  // Model detection variables
  const [modelLoading, setModelLoading] = useState({ loading: true, progress: 0 }); // loading state
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  });
  const [segModel, setSegModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  });
  const [modelName] = useState("yolo11n_detect"); // selected model name
  const [segmentationModelName] = useState("y11n_seg640"); // selected model name
  const [inferenceRunning, setInferenceRunning] = useState(false);
  const [loadingTime, setLoadingTime] = useState("");
  const [runningTime, setRunningTime] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [detectionResults, setDetectionResults] = useState<{ boxes: number[][], scores: number[], classes: number[] } | null>(null);
  const [segmentationResults, setSegmentationResults] = useState<{ boxes: number[][], scores: number[], classes: number[], masks: number[][] } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // END Model detection variables

  useEffect(() => {
    tf.ready().then(async () => {
      setModelLoading({ loading: true, progress: 0 });
      var startTime = performance.now();
      const yolo = await tf.loadGraphModel(
          `/${modelName}_web_model/model.json`,
          {
            onProgress: (fractions) => {
              setModelLoading({ loading: true, progress: fractions }); // set loading fractions
            },
          }
      );
      var endTime = performance.now();
      console.log(`Detection model loaded successfully in ${(endTime - startTime).toFixed(2)} ms`);
      var segStartTime = performance.now();
      const yoloSeg = await tf.loadGraphModel(
          `/${segmentationModelName}_web_model/model.json`,
          {
            onProgress: (fractions) => {
              setModelLoading({ loading: true, progress: fractions }); // set loading fractions
            },
          }
      );
      endTime = performance.now();
      setLoadingTime((endTime - startTime).toFixed(2));
      console.log(`Segmentatinon model loaded successfully in ${(endTime - segStartTime).toFixed(2)} ms`);
      console.log(`All models loaded successfully in ${(endTime - startTime).toFixed(2)} ms`);
      // warming up model
      // @ts-ignore
      const dummyInputSeg = tf.ones(yoloSeg.inputs[0].shape);
      const warmupResultsSeg = yoloSeg.execute(dummyInputSeg);
      const dummyInput = tf.ones(yolo.inputs[0].shape);
      const warmupResults = yolo.execute(dummyInput);

      setModelLoading({ loading: false, progress: 1 });
      startTime = performance.now();
      setModel({
        // @ts-ignore
        net: yolo,
        // @ts-ignore
        inputShape: yolo.inputs[0].shape,
      });
      console.log("warmupResultsSeg",warmupResultsSeg)
      setSegModel({
        // @ts-ignore
        net: yoloSeg,
        // @ts-ignore
        inputShape: yoloSeg.inputs[0].shape,
        // @ts-ignore
        outputShape: warmupResultsSeg.map((e) => e.shape),
      });
      endTime = performance.now();
      tf.dispose([warmupResults,warmupResultsSeg, dummyInput, dummyInputSeg]); // cleanup memory
      console.log(`Models warmed up in ${(endTime - startTime).toFixed(2)} ms`);
    });
  }, [modelName]); // reload model when modelName changes

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
    setInferenceRunning(false); // Reset inference state on new file selection
    setDetectionResults(null); // Clear previous results on new file select
    setSegmentationResults(null); // Clear previous results on new file select

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        if (model && !inferenceRunning) { // Check if model is loaded and no inference is running
          setInferenceRunning(true);
          console.log("Running detection inference...");

          try {
            var startTime = performance.now();
            const detectionResults = await detect(img, model);
            console.debug(`Detection running time ${(performance.now() - startTime).toFixed(2)}`)
            setRunningTime((performance.now() - startTime).toFixed(2));
            setDetectionResults(detectionResults);
            console.log("Detection Inference complete. Detection results:", detectionResults);

            startTime = performance.now();
            const segmentationResults = await segment(img, segModel);
            setSegmentationResults(segmentationResults)
            console.log(`Segmentation running time ${(performance.now() - startTime).toFixed(2)}`)
            console.log("Segmentation Inference complete. Segmentation results:", segmentationResults);

          } catch (error) {
            console.error("Error during detection:", error);
            setRunningTime("")
            setDetectionResults(null); // Clear results on error
            setSegmentationResults(null); // Clear results on error

            // Handle detection errors
          } finally {
            // Optional: Unset inference running state
            setInferenceRunning(false);
          }

        } else if (!model) {
          console.warn("Model not loaded yet. Cannot run inference.");
        } else if (inferenceRunning) {
          console.warn("Inference is already running.");
        }

      };
      img.onerror = (error) => {
        console.error("Error loading image:", error);
        // Optional: Handle image loading errors, unset loading states
        setLoadingImage(false);
        setInferenceRunning(false);
        setRunningTime("")
        setDetectionResults(null); // Clear results on error
        setSegmentationResults(null); // Clear results on error

      };
      // @ts-ignore
      img.src = e.target.result as string; // Set the image source
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      // Optional: Handle file reading errors, unset loading states
      setLoadingImage(false);
      setInferenceRunning(false);
      setRunningTime("")
      setDetectionResults(null); // Clear results on error

    };


    if (file) {
      // @ts-ignore
      reader.readAsDataURL(file); // Read the file as a data URL
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Case Information Section */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Case Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
        </Grid>
        
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
          <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
            Panoramic X-Ray
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h8" sx={{ mt: 2, mb: 2 }}>
            Loaded models in {loadingTime && `${loadingTime} ms`} {inferenceRunning ? "| running model ...." : ""} {runningTime !== "" ? "| running in " +`${runningTime} ms` : "" }
          </Typography>
          <Divider sx={{ mb: 3 }} />
        </Grid>
        
        <Grid item xs={12}>
          <ImageUpload
              detectionResults={detectionResults}
              segmentationResults={segmentationResults}
              canvasRef = {canvasRef}
            onFileSelect={handleFileSelect}
            acceptedFileTypes="image/*"
            maxSizeMB={12}
            disabled={loading}
          />
        </Grid>
        
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