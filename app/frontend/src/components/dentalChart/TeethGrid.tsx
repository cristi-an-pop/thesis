import { Tooth } from "@/types/Tooth";
import { Box, Paper, Typography, Tooltip } from "@mui/material";

interface TeethGridProps {
    teeth: Tooth[];
    selectedTooth: Tooth | null;
    onToothSelect: (tooth: Tooth) => void;
    renderToothSvg: (tooth: Tooth) => React.ReactNode;
    getToothTooltip: (tooth: Tooth) => string;
}

const TeethGrid = ({ teeth, selectedTooth, onToothSelect, renderToothSvg, getToothTooltip }: TeethGridProps) => {
    // Sort and organize teeth by European numbering
    const getEuropeanNumber = (tooth: Tooth): number => {
        return tooth.europeanNumber || (tooth.position.quadrant * 10 + tooth.position.number);
    };

    // Filter and sort upper teeth (quadrants 1 and 2: teeth 11-18, 21-28)
    const upperTeeth = teeth
        .filter(tooth => {
            const euroNumber = getEuropeanNumber(tooth);
            return (euroNumber >= 11 && euroNumber <= 18) || (euroNumber >= 21 && euroNumber <= 28);
        })
        .sort((a, b) => {
            const euroNumA = getEuropeanNumber(a);
            const euroNumB = getEuropeanNumber(b);
            
            // For upper right (11-18), we want them in reverse order (18 to 11, right to left)
            if ((euroNumA >= 11 && euroNumA <= 18) && (euroNumB >= 11 && euroNumB <= 18)) {
                return euroNumB - euroNumA;
            }
            
            // For upper left (21-28), we want them in ascending order (21 to 28, left to right)
            if ((euroNumA >= 21 && euroNumA <= 28) && (euroNumB >= 21 && euroNumB <= 28)) {
                return euroNumA - euroNumB;
            }
            
            // If comparing teeth from different quadrants, sort by quadrant first
            const quadrantA = Math.floor(euroNumA / 10);
            const quadrantB = Math.floor(euroNumB / 10);
            return quadrantA - quadrantB;
        });
    
    // Filter and sort lower teeth (quadrants 3 and 4: teeth 31-38, 41-48)
    const lowerTeeth = teeth
        .filter(tooth => {
            const euroNumber = getEuropeanNumber(tooth);
            return (euroNumber >= 31 && euroNumber <= 38) || (euroNumber >= 41 && euroNumber <= 48);
        })
        .sort((a, b) => {
            const euroNumA = getEuropeanNumber(a);
            const euroNumB = getEuropeanNumber(b);
            
            // For lower left (31-38), we want them in ascending order (31 to 38, left to right)
            if ((euroNumA >= 31 && euroNumA <= 38) && (euroNumB >= 31 && euroNumB <= 38)) {
                return euroNumA - euroNumB;
            }
            
            // For lower right (41-48), we want them in reverse order (48 to 41, right to left)
            if ((euroNumA >= 41 && euroNumA <= 48) && (euroNumB >= 41 && euroNumB <= 48)) {
                return euroNumB - euroNumA;
            }
            
            // If comparing teeth from different quadrants, sort by quadrant first
            const quadrantA = Math.floor(euroNumA / 10);
            const quadrantB = Math.floor(euroNumB / 10);
            return quadrantA - quadrantB;
        });

    return (
        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Dental Chart
            </Typography>
            
            <Box sx={{ textAlign: 'center' }}>
                {/* Upper teeth row */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mb: 2,
                    borderBottom: '1px dashed',
                    borderColor: 'divider',
                    pb: 2
                }}>
                    {upperTeeth.map((tooth) => (
                        <Tooltip 
                            key={tooth.id} 
                            title={getToothTooltip(tooth)}
                            arrow
                        >
                            <Box 
                                onClick={() => onToothSelect(tooth)}
                                sx={{ 
                                    p: 0.5,
                                    cursor: 'pointer',
                                    bgcolor: selectedTooth?.id === tooth.id ? 'action.selected' : 'transparent',
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                {renderToothSvg(tooth)}
                                <Typography variant="caption" display="block" textAlign="center">
                                    {getEuropeanNumber(tooth)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
                
                {/* Lower teeth row */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {lowerTeeth.map((tooth) => (
                        <Tooltip 
                            key={tooth.id} 
                            title={getToothTooltip(tooth)}
                            arrow
                        >
                            <Box 
                                onClick={() => onToothSelect(tooth)}
                                sx={{ 
                                    p: 0.5,
                                    cursor: 'pointer',
                                    bgcolor: selectedTooth?.id === tooth.id ? 'action.selected' : 'transparent',
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                {renderToothSvg(tooth)}
                                <Typography variant="caption" display="block" textAlign="center">
                                    {getEuropeanNumber(tooth)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

export default TeethGrid;