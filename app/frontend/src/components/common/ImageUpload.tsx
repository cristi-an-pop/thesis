import React, {useState, useRef} from 'react';
import {Box, Typography, Button, Paper, Alert} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

interface ImageUploadProps {
    onFileSelect: (file: File | null) => void,
    acceptedFileTypes?: string,
    maxSizeMB?: number,
    disabled?: boolean
}

const ImageUpload = ({ onFileSelect, acceptedFileTypes = "image/*", maxSizeMB = 5, disabled = false }: ImageUploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files ? e.target.files[0] : null;
        processFile(selectedFile);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = (selectedFile: File | null) => {
        setError(null);

        if (!selectedFile) {
            setFile(null);
            setPreviewUrl(null);
            onFileSelect(null);
            return;
        }

        if (!selectedFile.type.match(acceptedFileTypes.replace('*', ''))) {
            setError(`Invalid file type. Please upload ${acceptedFileTypes}`);
            return;
        }

        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (selectedFile.size > maxSizeBytes) {
            setError(`File size exceeds the ${maxSizeMB}MB limit`);
            return;
        }

        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);

        onFileSelect(selectedFile);
    };

    const handleClearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setError(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}

            <Paper
                sx={{
                    p: 3,
                    border: '1px dashed',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: isDragging ? 'action.hover' : 'background.paper',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.7 : 1
                }}
                onDrop={disabled ? undefined : handleDrop}
                onDragOver={disabled ? undefined : handleDragOver}
                onDragLeave={disabled ? undefined : handleDragLeave}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    accept={acceptedFileTypes}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{display: 'none'}}
                    disabled={disabled}
                />

                {!previewUrl ? (
                    <Box sx={{textAlign: 'center', py: 3}}>
                        <CloudUploadIcon sx={{fontSize: 60, color: 'text.secondary', mb: 1}}/>
                        <Typography variant="h6" color="text.secondary">
                            Drag & Drop X-Ray Image
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                            or click to browse files
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Max size: {maxSizeMB}MB - Accepted formats: {acceptedFileTypes}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{
                            textAlign: 'center',
                            mb: 2,
                            position: 'relative',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Box
                                component="img"
                                src={previewUrl}
                                alt="X-Ray preview"
                                sx={{
                                    maxWidth: '100%',
                                    maxHeight: 400,
                                    objectFit: 'contain'
                                }}
                            />
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    minWidth: 'auto',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    p: 0
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearFile();
                                }}
                                disabled={disabled}
                            >
                                <CloseIcon fontSize="small"/>
                            </Button>
                        </Box>
                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <AttachFileIcon fontSize="small" sx={{mr: 0.5, color: 'text.secondary'}}/>
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {file?.name}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default ImageUpload;