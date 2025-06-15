import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CropFreeIcon from '@mui/icons-material/CropFree';
import CancelIcon from '@mui/icons-material/Cancel';
import { BoundingBox } from '@/types/Case';

const ZOOM_LIMITS = { min: 0.25, max: 4, step: 0.25 };
const MIN_BBOX_SIZE = 1;

export interface XRayCanvasRef {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  startDrawing: () => void;
  cancelDrawing: () => void;
}

interface XRayCanvasProps {
  imageUrl?: string;
  boundingBoxes?: BoundingBox[];
  selectedBoundingBox?: BoundingBox | null;
  onBoundingBoxCreated?: (bbox: BoundingBox) => void;
  onBoundingBoxSelected?: (bbox: BoundingBox | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const XRayCanvas = forwardRef<XRayCanvasRef, XRayCanvasProps>(({ 
  imageUrl, 
  boundingBoxes = [],
  selectedBoundingBox = null,
  onBoundingBoxCreated,
  onBoundingBoxSelected,
  className, 
  style 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Bounding box drawing state
  const [isDrawingBBox, setIsDrawingBBox] = useState(false);
  const [bboxStart, setBboxStart] = useState<{ x: number, y: number } | null>(null);
  const [currentBBox, setCurrentBBox] = useState<BoundingBox | null>(null);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => direction === 'in' 
      ? Math.min(prev + ZOOM_LIMITS.step, ZOOM_LIMITS.max) 
      : Math.max(prev - ZOOM_LIMITS.step, ZOOM_LIMITS.min)
    );
  };

  const resetDrawing = () => {
    setIsDrawingBBox(false);
    setBboxStart(null);
    setCurrentBBox(null);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    resetView,
    zoomIn: () => handleZoom('in'),
    zoomOut: () => handleZoom('out'),
    startDrawing: () => setIsDrawingBBox(true),
    cancelDrawing: resetDrawing
  }));

  const screenToImageCoords = (screenX: number, screenY: number) => {
    if (!imageRef.current || !containerRef.current) return null;
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const imageX = imageRect.left - containerRect.left;
    const imageY = imageRect.top - containerRect.top;
    const imageWidth = imageRect.width;
    const imageHeight = imageRect.height;
    
    if (screenX < imageX || screenX > imageX + imageWidth || 
        screenY < imageY || screenY > imageY + imageHeight) {
      return null;
    }
    
    const x = ((screenX - imageX) / imageWidth) * 100;
    const y = ((screenY - imageY) / imageHeight) * 100;
    
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    if (isDrawingBBox) {
      const imageCoords = screenToImageCoords(screenX, screenY);
      if (imageCoords) {
        setBboxStart(imageCoords);
        setCurrentBBox({ x: imageCoords.x, y: imageCoords.y, width: 0, height: 0 });
      }
    } else {
      const imageCoords = screenToImageCoords(screenX, screenY);
      if (imageCoords && onBoundingBoxSelected) {
        const clickedBBox = boundingBoxes.find(bbox => 
          imageCoords.x >= bbox.x && 
          imageCoords.x <= bbox.x + bbox.width &&
          imageCoords.y >= bbox.y && 
          imageCoords.y <= bbox.y + bbox.height
        );
        onBoundingBoxSelected(clickedBBox || null);
      }
      
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    if (isDrawingBBox && bboxStart) {
      const imageCoords = screenToImageCoords(screenX, screenY);
      if (imageCoords) {
        const width = imageCoords.x - bboxStart.x;
        const height = imageCoords.y - bboxStart.y;
        
        setCurrentBBox({
          x: width < 0 ? bboxStart.x + width : bboxStart.x,
          y: height < 0 ? bboxStart.y + height : bboxStart.y,
          width: Math.abs(width),
          height: Math.abs(height)
        });
      }
    } else if (isDragging && !isDrawingBBox) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    if (isDrawingBBox && currentBBox && bboxStart) {
      if (currentBBox.width > MIN_BBOX_SIZE && currentBBox.height > MIN_BBOX_SIZE) {
        onBoundingBoxCreated?.(currentBBox);
      }
      resetDrawing();
    } else {
      setIsDragging(false);
    }
  };

  // Draw overlay with bounding boxes
  useEffect(() => {
    if (!containerRef.current || !imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    // Remove existing overlay
    container.querySelector('.bbox-overlay')?.remove();
    
    // Set up canvas overlay
    canvas.className = 'bbox-overlay';
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10';
    
    container.appendChild(canvas);
    
    // Get image dimensions and position
    const imageRect = image.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const imageX = imageRect.left - containerRect.left;
    const imageY = imageRect.top - containerRect.top;
    const imageWidth = imageRect.width;
    const imageHeight = imageRect.height;
    
    // Draw bounding box helper
    const drawBBox = (bbox: BoundingBox, color: string, dashed = false) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [5, 5] : []);
      
      const x = imageX + (bbox.x / 100) * imageWidth;
      const y = imageY + (bbox.y / 100) * imageHeight;
      const width = (bbox.width / 100) * imageWidth;
      const height = (bbox.height / 100) * imageHeight;
      
      ctx.strokeRect(x, y, width, height);
    };
    
    // Draw existing bounding boxes
    boundingBoxes.forEach(bbox => {
      const isSelected = selectedBoundingBox && 
        bbox.x === selectedBoundingBox.x && 
        bbox.y === selectedBoundingBox.y &&
        bbox.width === selectedBoundingBox.width && 
        bbox.height === selectedBoundingBox.height;
      
      drawBBox(bbox, isSelected ? '#ff0000' : '#00ff00', !isSelected);
    });
    
    // Draw current bounding box being created
    if (isDrawingBBox && currentBBox) {
      drawBBox(currentBBox, '#ff9900', true);
    }
    
  }, [boundingBoxes, selectedBoundingBox, isDrawingBBox, currentBBox, zoomLevel, panOffset]);

  if (!imageUrl) {
    return (
      <Box
        ref={containerRef}
        className={className}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.900',
          color: 'white',
          minHeight: 400,
          borderRadius: 1,
          ...style
        }}
      >
        No X-Ray Image Available
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        position: 'relative',
        cursor: isDrawingBBox ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
        bgcolor: 'black',
        overflow: 'hidden',
        borderRadius: 1,
        ...style
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
      onWheel={(e) => {
        e.preventDefault();
        handleZoom(e.deltaY < 0 ? 'in' : 'out');
      }}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="X-Ray"
        style={{
          display: 'block',
          width: 'auto',
          height: '100%',
          objectFit: 'contain',
          transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
          transformOrigin: 'center center',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />
      
      {/* Zoom Controls */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 16, 
        right: 16, 
        bgcolor: 'rgba(0,0,0,0.8)',
        borderRadius: 2,
        p: 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5
      }}>
        <IconButton 
          size="small" 
          onClick={() => handleZoom('in')}
          disabled={zoomLevel >= ZOOM_LIMITS.max}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={() => handleZoom('out')}
          disabled={zoomLevel <= ZOOM_LIMITS.min}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={resetView}
          disabled={zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {/* Bounding Box Controls */}
      <Box sx={{ 
        position: 'absolute',
        top: 16, 
        right: 16, 
        bgcolor: 'rgba(0,0,0,0.8)',
        borderRadius: 2,
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {isDrawingBBox ? (
          <>
            <Typography variant="caption" sx={{ color: 'white', px: 1 }}>
              Drawing Mode
            </Typography>
            <IconButton 
              size="small" 
              onClick={resetDrawing}
              sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <IconButton 
            size="small" 
            onClick={() => setIsDrawingBBox(true)}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <CropFreeIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {/* Zoom Level Indicator */}
      {zoomLevel !== 1 && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          bgcolor: 'rgba(0,0,0,0.8)',
          borderRadius: 1,
          px: 1,
          py: 0.5,
          color: 'white',
          fontSize: '0.75rem'
        }}>
          {Math.round(zoomLevel * 100)}%
        </Box>
      )}
    </Box>
  );
});

XRayCanvas.displayName = 'XRayCanvas';

export default XRayCanvas;