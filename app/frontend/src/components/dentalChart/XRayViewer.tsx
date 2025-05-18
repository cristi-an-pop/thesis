import { XRayImage } from "@/types/XRayImage";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";

interface XRayViewerProps {
    xray: XRayImage | null;
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
  }
  
const XRayViewer = ({ xray, zoomLevel, onZoomIn, onZoomOut, onResetZoom }: XRayViewerProps) => {
    return (
        <Paper sx={{ mb: 2, flex: 1, overflow: 'hidden', position: 'relative' }}>
        {xray ? (
            <>
            <Box
                component="img"
                src={xray.imageUrl}
                alt="X-Ray"
                sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                bgcolor: 'black',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.3s ease-out',
                }}
            />
            <Box sx={{ 
                position: 'absolute', 
                bottom: 8, 
                right: 8, 
                bgcolor: 'rgba(0,0,0,0.5)',
                borderRadius: 1,
                p: 0.5,
                display: 'flex'
            }}>
                <IconButton 
                size="small" 
                onClick={onZoomIn}
                sx={{ color: 'white' }}
                >
                <ZoomInIcon fontSize="small" />
                </IconButton>
                <IconButton 
                size="small" 
                onClick={onZoomOut}
                sx={{ color: 'white' }}
                >
                <ZoomOutIcon fontSize="small" />
                </IconButton>
                <IconButton 
                size="small" 
                onClick={onResetZoom}
                sx={{ color: 'white' }}
                >
                <RotateLeftIcon fontSize="small" />
                </IconButton>
            </Box>
            </>
        ) : (
            <Box 
            sx={{ 
                height: '100%',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.default',
                border: '1px dashed',
                borderColor: 'divider',
                flexDirection: 'column'
            }}
            >
            <ImageIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="body2">
                No X-ray image available
            </Typography>
            </Box>
        )}
        </Paper>
    );
};

export default XRayViewer;