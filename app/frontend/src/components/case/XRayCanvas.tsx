import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CropFreeIcon from '@mui/icons-material/CropFree';
import CancelIcon from '@mui/icons-material/Cancel';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  noteId: string;
}

export interface XRayCanvasRef {
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  startDrawing: () => void;
  cancelDrawing: () => void;
}

interface XRayCanvasProps {
  imageUrl?: string;
  boundingBoxes: BoundingBox[];
  selectedBoundingBox?: BoundingBox | null;
  onBoundingBoxCreated: (bbox: Omit<BoundingBox, 'id'>) => void;
  onBoundingBoxSelected: (bbox: BoundingBox | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const XRayCanvas = forwardRef<XRayCanvasRef, XRayCanvasProps>(({ imageUrl, boundingBoxes = [], selectedBoundingBox = null, onBoundingBoxCreated, onBoundingBoxSelected, className, style }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDrawingBBox, setIsDrawingBBox] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentBBox, setCurrentBBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  useImperativeHandle(ref, () => ({
    resetZoom: () => setZoomLevel(1),
    zoomIn: () => setZoomLevel(prev => Math.min(prev + 0.25, 3)),
    zoomOut: () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5)),
    startDrawing: () => setIsDrawingBBox(true),
    cancelDrawing: () => {
      setIsDrawingBBox(false);
      setStartPoint(null);
      setCurrentBBox(null);
    }
  }));

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;
    
    image.onload = () => {
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const imgRatio = image.width / image.height;
      const canvasRatio = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (canvasRatio > imgRatio) {
        drawHeight = canvas.height * zoomLevel;
        drawWidth = image.width * (drawHeight / image.height);
        offsetX = (canvas.width - drawWidth) / 2;
      } else {
        drawWidth = canvas.width * zoomLevel;
        drawHeight = image.height * (drawWidth / image.width);
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
      
      boundingBoxes.forEach(bbox => {
        const isSelected = selectedBoundingBox && selectedBoundingBox.id === bbox.id;
        
        ctx.strokeStyle = isSelected ? '#ff0000' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash(isSelected ? [] : [5, 5]);
        
        const x = (bbox.x * drawWidth / 100) + offsetX;
        const y = (bbox.y * drawHeight / 100) + offsetY;
        const width = (bbox.width * drawWidth / 100);
        const height = (bbox.height * drawHeight / 100);
        
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
      });
      
      if (isDrawingBBox && currentBBox) {
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentBBox.x, currentBBox.y, currentBBox.width, currentBBox.height);
        ctx.setLineDash([]);
      }
    };

    image.onerror = () => {
      console.error('Failed to load X-ray image');
    };
  }, [imageUrl, zoomLevel, boundingBoxes, selectedBoundingBox, isDrawingBBox, currentBBox]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingBBox) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setCurrentBBox({ x, y, width: 0, height: 0 });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingBBox || !startPoint || !currentBBox) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentBBox({
      x: startPoint.x,
      y: startPoint.y,
      width: x - startPoint.x,
      height: y - startPoint.y
    });
  };
  
  const handleMouseUp = () => {
    if (!isDrawingBBox || !startPoint || !currentBBox) return;
    
    if (Math.abs(currentBBox.width) > 10 && Math.abs(currentBBox.height) > 10) {
      const normalizedBBox = {
        x: currentBBox.width < 0 ? startPoint!.x + currentBBox.width : startPoint!.x,
        y: currentBBox.height < 0 ? startPoint!.y + currentBBox.height : startPoint!.y,
        width: Math.abs(currentBBox.width),
        height: Math.abs(currentBBox.height)
      };
      
      const canvas = canvasRef.current!;
      const newBBox = {
        x: (normalizedBBox.x / canvas.width) * 100,
        y: (normalizedBBox.y / canvas.height) * 100,
        width: (normalizedBBox.width / canvas.width) * 100,
        height: (normalizedBBox.height / canvas.height) * 100,
        noteId: `temp-${Date.now()}`
      };
      
      onBoundingBoxCreated(newBBox);
      
      setIsDrawingBBox(false);
    }
    
    setStartPoint(null);
    setCurrentBBox(null);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingBBox) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (const bbox of boundingBoxes) {
      const bboxX = (bbox.x * canvas.width / 100);
      const bboxY = (bbox.y * canvas.height / 100);
      const bboxWidth = (bbox.width * canvas.width / 100);
      const bboxHeight = (bbox.height * canvas.height / 100);
      
      if (
        x >= bboxX && 
        x <= bboxX + bboxWidth && 
        y >= bboxY && 
        y <= bboxY + bboxHeight
      ) {
        onBoundingBoxSelected(bbox);
        return;
      }
    }
    
    onBoundingBoxSelected(null);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
  };
  
  const handleStartDrawing = () => {
    setIsDrawingBBox(true);
  };
  
  const handleCancelDrawing = () => {
    setIsDrawingBBox(false);
    setStartPoint(null);
    setCurrentBBox(null);
  };

  if (!imageUrl) {
    return (
      <Box
        ref={containerRef}
        className={className}
        style={style}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.900',
          color: 'white',
          minHeight: 400,
          ...style
        }}
      >
        <Typography variant="h6" color="inherit">
          No X-Ray Image Available
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        position: 'relative',
        cursor: isDrawingBBox ? 'crosshair' : 'default',
        bgcolor: 'black',
        overflow: 'hidden',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      
      {/* Canvas controls */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 8, 
        right: 8, 
        bgcolor: 'rgba(0,0,0,0.7)',
        borderRadius: 1,
        p: 0.5,
        display: 'flex'
      }}>
        <IconButton 
          size="small" 
          onClick={handleZoomIn}
          sx={{ color: 'white' }}
          disabled={zoomLevel >= 3}
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleZoomOut}
          sx={{ color: 'white' }}
          disabled={zoomLevel <= 0.5}
        >
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleResetZoom}
          sx={{ color: 'white' }}
          disabled={zoomLevel === 1}
        >
          <ArrowBackIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
        </IconButton>
      </Box>
      
      {/* Bounding box controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        bgcolor: 'rgba(0,0,0,0.7)',
        borderRadius: 1,
        p: 0.5,
        display: 'flex'
      }}>
        {isDrawingBBox ? (
          <IconButton 
            size="small" 
            onClick={handleCancelDrawing}
            sx={{ color: 'white' }}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton 
            size="small" 
            onClick={handleStartDrawing}
            sx={{ color: 'white' }}
          >
            <CropFreeIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {/* Drawing instruction */}
      {isDrawingBBox && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          bgcolor: 'rgba(0,0,0,0.7)',
          borderRadius: 1,
          p: 1,
          color: 'white'
        }}>
          <Typography variant="caption">
            Click and drag to create an annotation area
          </Typography>
        </Box>
      )}
    </Box>
  );
});

XRayCanvas.displayName = 'XRayCanvas';

export default XRayCanvas;