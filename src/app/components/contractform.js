import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Typography,
    Box
} from '@mui/material';

const ContractFormDialog = ({
    open,
    onClose,
    formData,
    setFormData,
    approvedCandidates,
    onSave,
    patronData
}) => {
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                style: {
                    maxHeight: '90vh',
                    borderRadius: '12px'
                }
            }}
        >
            <DialogTitle sx={{
                backgroundColor: '#1976d2',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.25rem'
            }}>
                📝 Fill Contract Form
            </DialogTitle>

            <DialogContent style={{ paddingTop: "24px", backgroundColor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Information Box */}
                    <Box sx={{
                        backgroundColor: '#e3f2fd',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #1976d2'
                    }}>
                        <Typography variant="body2" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                            ℹ️ Contract Date Information
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#424242', mt: 1 }}>
                            This contract will be dated: <strong>{new Date().toLocaleDateString('en-GB')}</strong>
                        </Typography>
                    </Box>

                    {/* Annexure I Section */}
                    <Box sx={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '2px solid #1976d2'
                    }}>
                        <Typography variant="h6" sx={{
                            color: '#1976d2',
                            fontWeight: 'bold',
                            mb: 2,
                            borderBottom: '2px solid #1976d2',
                            paddingBottom: '8px'
                        }}>
                            📋 Annexure I - Associate Details
                        </Typography>


                        {/*  Working Arrangement */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Working Arrangement (Hours) *
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.workingArrangement}
                                onChange={(e) => handleChange('workingArrangement', e.target.value)}
                                variant="outlined"
                                placeholder="e.g., 6-8 hours"
                                sx={{ backgroundColor: '#fff' }}
                            />
                        </Box>

                        {/* Associate's Monthly Dues */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Associate&apos;s Monthly Dues *
                            </Typography>
                            <TextField
                                fullWidth
                                value={formData.monthlyDues}
                                onChange={(e) => handleChange('monthlyDues', e.target.value)}
                                variant="outlined"
                                placeholder="e.g., Rs. 25,000"
                                sx={{ backgroundColor: '#fff' }}
                            />
                        </Box>

                        {/*  Scope of Work */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Scope of Work *
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.scopeOfWork}
                                onChange={(e) => handleChange('scopeOfWork', e.target.value)}
                                variant="outlined"
                                placeholder="Enter scope of work"
                                sx={{ backgroundColor: '#fff' }}
                            />
                        </Box>

                        {/* Date of Deployment */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Date of Deployment *
                            </Typography>
                            <TextField
                                type="date"
                                fullWidth
                                value={formData.deploymentDate}
                                onChange={(e) => handleChange('deploymentDate', e.target.value)}
                                variant="outlined"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                                sx={{ backgroundColor: '#fff' }}
                            />
                        </Box>
                    </Box>

                    {/* Annexure II Section */}
                    <Box sx={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '2px solid #ff9800'
                    }}>
                        <Typography variant="h6" sx={{
                            color: '#ff9800',
                            fontWeight: 'bold',
                            mb: 2,
                            borderBottom: '2px solid #ff9800',
                            paddingBottom: '8px'
                        }}>
                            💰 Annexure II - Payment Details
                        </Typography>

                        {/* Registration Fee (Fixed) */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#424242',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Registration Fee
                            </Typography>
                            <TextField
                                fullWidth
                                value="Rs. 2,000"
                                disabled
                                variant="outlined"
                                sx={{
                                    backgroundColor: '#f5f5f5',
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        WebkitTextFillColor: '#424242',
                                        fontWeight: 'bold'
                                    }
                                }}
                            />
                            <Typography variant="caption" sx={{ color: '#757575', mt: 0.5, display: 'block' }}>
                                Timing: Before Starting Recruitment
                            </Typography>
                        </Box>

                        {/* Recruitment Fee */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                mb: 1
                            }}>
                                Recruitment Fee (50% of Monthly Salary - Registration Fee) *
                            </Typography>
                            <TextField
                                fullWidth
                                value={formData.recruitmentFee}
                                onChange={(e) => handleChange('recruitmentFee', e.target.value)}
                                variant="outlined"
                                placeholder="e.g., Rs. 10,500 (if salary is Rs. 25,000)"
                                sx={{ backgroundColor: '#fff' }}
                                helperText="Formula: (Monthly Dues × 50%) - Rs. 2,000"
                            />
                            <Typography variant="caption" sx={{ color: '#757575', mt: 0.5, display: 'block' }}>
                                Timing: After 3 days of trial and at the time of Deployment
                            </Typography>
                        </Box>
                    </Box>

                    {/* Note */}
                    <Box sx={{
                        backgroundColor: '#fff3e0',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #ff9800'
                    }}>
                        <Typography variant="body2" sx={{ color: '#e65100' }}>
                            <strong>Note:</strong> All fields marked with * are mandatory. The contract date will be automatically filled with today&apos;s date.
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions style={{
                justifyContent: "center",
                padding: "20px",
                gap: "16px",
                backgroundColor: '#fff',
                borderTop: '1px solid #e0e0e0'
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        color: "#757575",
                        borderColor: "#bdbdbd",
                        width: "140px",
                        '&:hover': {
                            borderColor: "#757575",
                            backgroundColor: '#f5f5f5'
                        }
                    }}
                >
                    CANCEL
                </Button>
                <Button
                    onClick={onSave}
                    variant="contained"
                    sx={{
                        backgroundColor: "#1976d2",
                        color: "#fff",
                        width: "140px",
                        '&:hover': {
                            backgroundColor: "#1565c0"
                        }
                    }}
                >
                    SAVE FORM
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ContractFormDialog;