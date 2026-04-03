import React from 'react';
import {
    TextField,
    MenuItem,
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    Chip
} from '@mui/material';
// CORRECTED: Using simpler icon names (Done and Close) to resolve module not found error.
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';

// Grilling Questions Data (No changes here)
const GRILLING_QUESTIONS = {
    "Housekeeper": [
        "What is your daily cleaning routine in a house?",
        "How do you clean mirrors, glass, and marble floors?",
        "What products do you use for cleaning bathrooms vs. kitchens?",
        "How do you make a bed properly?",
        "How do you clean delicate furniture or decor?",
        "How often should bedsheets and curtains be changed?",
        "What precautions do you take while cleaning electrical appliances?",
        "How do you manage time when cleaning multiple rooms?"
    ],
    "Home Cook": [
        "What cuisines are you most confident in cooking?",
        "What dishes can you prepare for breakfast, lunch, and dinner?",
        "How do you ensure hygiene while cooking?",
        "How do you handle client-specific dietary preferences or allergies?",
        "How do you ensure taste consistency daily?",
        "How do you plan a balanced meal for a family of four?",
        "What's the difference between North Indian and South Indian cooking styles?",
        "How do you store leftovers safely?"
    ],
    "Home Chef": [
        "Can you cook multiple cuisines (Indian, Continental, Chinese)?",
        "How do you plate or present food?",
        "How do you manage timing when cooking multiple dishes?",
        "What cooking equipment do you know how to use (oven, OTG, grill)?",
        "How do you plan a weekly menu?",
        "How do you handle large family or party cooking?",
        "What are your hygiene practices in a high-end kitchen?",
        "How do you respond if a client complains about taste?"
    ],
    "Nanny": [
        "What age groups have you cared for?",
        "How do you handle feeding and sleeping schedules?",
        "What would you do if a child refuses to eat?",
        "How do you ensure a child's safety at home?",
        "How do you engage children in learning or play activities?",
        "How do you handle emergencies or injuries?",
        "How do you maintain hygiene during diaper changing or feeding?",
        "What do you do if the child cries continuously?"
    ],
    "Driver/Chauffeur": [
        "What types of cars have you driven (manual, automatic, luxury)?",
        "How do you maintain vehicle cleanleness?",
        "What do you check before starting a trip?",
        "How do you manage traffic or delays?",
        "How familiar are you with routes in your city?",
        "Have you ever driven for VIPs or families before?",
        "How do you behave when client is in the car?",
        "What safety measures do you follow while driving?",
        "How do you handle fuel, maintenance, and parking issues?"
    ],
    "House Manager": [
        "What are your key responsibilities as a House Manager?",
        "How do you manage and supervise other domestic staff?",
        "How do you handle inventory, grocery, and vendor coordination?",
        "How do you manage guest arrivals or home events?",
        "How do you report or communicate with the homeowner?",
        "How do you handle emergencies (plumbing, electricity, etc.)?",
        "What is your approach to maintaining household discipline?",
        "How do you ensure all staff follow hygiene and time rules?"
    ],
    "Butler": [
        "How do you set a formal dining table?",
        "What is your process for serving food and beverages to guests?",
        "How do you maintain confidentiality and discretion in private homes?",
        "How do you manage pantry and tableware organization?",
        "How do you coordinate with the kitchen and housekeeping team?",
        "How do you prepare for a formal event or dinner?",
        "What is your grooming standard as a Butler?"
    ],
    "Governess": [
        "What subjects or areas can you assist children with?",
        "How do you make study time engaging for children?",
        "How do you handle children of different learning levels?",
        "How do you ensure discipline without punishment?",
        "How do you communicate with parents about progress?",
        "What methods do you use for behavior management?",
        "How do you balance academics and play?",
        "What would you do if a child refuses to study?"
    ],
    "House Boy": [
        "What kind of household work are you comfortable with?",
        "How do you assist in kitchen or cleaning tasks?",
        "Can you serve guests or handle errands?",
        "How do you manage instructions from multiple people?",
        "How do you take care of laundry or ironing?",
        "How do you maintain punctuality and cleanliness?",
        "What would you do if you don't understand an instruction?",
        "How do you respond if a client asks for extra help beyond your scope?"
    ],
    "Helper": [
        "What kind of household work are you comfortable with?",
        "How do you assist in kitchen or cleaning tasks?",
        "Can you serve guests or handle errands?",
        "How do you manage instructions from multiple people?",
        "How do you take care of laundry or ironing?",
        "How do you maintain punctuality and cleanliness?",
        "What would you do if you don't understand an instruction?",
        "How do you respond if a client asks for extra help beyond your scope?"
    ],
   
};

// Evaluation Criteria by Role (No changes here)
const EVALUATION_CRITERIA = {
    "Housekeeper": [
        "Grooming & Hygiene",
        "Knowledge of Cleaning Tools & Products",
        "Floor Cleaning & Dusting Technique",
        "Bathroom & Kitchen Cleaning",
        "Bed Making & Linen Handling",
        "Time Management",
        "Communication & Understanding",
        "Behavior & Attitude"
    ],
    "Home Cook": [
        "Taste & Seasoning",
        "Food Hygiene & Cleanliness",
        "Cooking Speed & Organization",
        "Variety & Presentation",
        "Adaptability to Instructions",
        "Interaction & Communication",
        "Punctuality & Attitude"
    ],
    "Home Chef": [
        "Multi-Cuisine Knowledge",
        "Taste & Presentation",
        "Portion Control & Plating",
        "Hygiene & Kitchen Organization",
        "Use of Modern Equipment",
        "Menu Planning Ability",
        "Professionalism & Attire"
    ],
    "Nanny": [
        "Age Group Experience",
        "Feeding & Hygiene Practices",
        "Handling Crying or Tantrums",
        "Safety Awareness",
        "Engagement & Play Activities",
        "Communication with Parents",
        "Patience & Emotional Warmth"
    ],
    "Driver/Chauffeur": [
        "Driving Skill (Manual/Automatic)",
        "Road Awareness & Route Knowledge",
        "Vehicle Maintenance & Cleanliness",
        "Grooming & Etiquette",
        "Traffic Discipline",
        "Punctuality",
        "Communication & Behavior"
    ],
    "House Manager": [
        "Leadership & Team Management",
        "Vendor / Staff Coordination",
        "Inventory & Stock Handling",
        "Communication with Homeowner",
        "Problem Solving & Decision Making",
        "Grooming & Professional Etiquette",
        "Reliability & Discretion"
    ],
    "Butler": [
        "Table Setup & Serving Etiquette",
        "Guest Interaction",
        "Pantry & Cutlery Organization",
        "Coordination with Kitchen Team",
        "Grooming & Presentation",
        "Confidentiality & Behavior"
    ],
    "Governess": [
        "Teaching / Tutoring Skill",
        "Child Discipline Management",
        "Creativity & Engagement",
        "Academic Knowledge",
        "Communication with Parents",
        "Grooming & Confidence"
    ],
    "House Boy": [
        "General Cleaning & Maintenance",
        "Assistance in Kitchen / Errands",
        "Laundry & Ironing",
        "Obedience & Discipline",
        "Hygiene & Grooming",
        "Punctuality",
        "Communication"
    ],
    "Helper": [
        "General Cleaning & Maintenance",
        "Assistance in Kitchen / Errands",
        "Laundry & Ironing",
        "Obedience & Discipline",
        "Hygiene & Grooming",
        "Punctuality",
        "Communication"
    ],
 
};

export default function TrialEvaluationForm({ role, formData, setFormData, showGrillingQuestions = false, candidateName, evaluatorName }) {
    // Get criteria and questions for the role
    const criteria = EVALUATION_CRITERIA[role] || EVALUATION_CRITERIA["Helper"] || [];
    const grillingQuestions = GRILLING_QUESTIONS[role] || GRILLING_QUESTIONS["Helper"] || [];

    const handleScoreChange = (criteriaName, value) => {
        setFormData(prev => ({
            ...prev,
            scores: {
                ...prev.scores,
                [criteriaName]: value
            }
        }));
    };

    const handleRemarkChange = (criteriaName, value) => {
        setFormData(prev => ({
            ...prev,
            remarks: {
                ...prev.remarks,
                [criteriaName]: value
            }
        }));
    };

    const handleOverallRatingChange = (value) => {
        setFormData(prev => ({
            ...prev,
            overallRating: value
        }));
    };

    const handleFinalVerdictChange = (value) => {
        setFormData(prev => ({
            ...prev,
            finalVerdict: value
        }));
    };

    const ratings = [
        { label: "Excellent", value: "Excellent", color: "success" },
        { label: "Good", value: "Good", color: "primary" },
        { label: "Average", value: "Average", color: "default" },
        { label: "Needs Training", value: "Needs Training", color: "warning" },
        { label: "Rejected", value: "Rejected", color: "error" }
    ];

    return (
        <Box sx={{ maxHeight: '65vh', overflowY: 'auto', p: 1, backgroundColor: '#f9f9f9' }}>

            {/* Header Section */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Box sx={{ borderBottom: '2px solid #ff5722', mb: 2, pb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
                        {role} Evaluation Form
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Candidate Name</Typography>
                        <Typography variant="body2" fontWeight="600">{candidateName || "-"}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Date</Typography>
                        <Typography variant="body2" fontWeight="600">{new Date().toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Evaluator</Typography>
                        <Typography variant="body2" fontWeight="600">{evaluatorName || "-"}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Grilling Questions (Optional) */}
            {showGrillingQuestions && grillingQuestions.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: '#fff8e1', border: '1px dashed #ffb74d', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#f57c00' }}>
                        📋 Grilling Questions
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {grillingQuestions.map((question, index) => (
                            <li key={index} style={{ marginBottom: '4px', fontSize: '16px', color: '#444' }}>
                                {question}
                            </li>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Evaluation Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: '600', color: '#555', width: '45%' }}>Criteria</TableCell>
                            <TableCell align="center" sx={{ fontWeight: '600', color: '#555', width: '15%' }}>Score (1-5)</TableCell>
                            <TableCell sx={{ fontWeight: '600', color: '#555', width: '40%' }}>Remarks</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {criteria.map((criteriaName, index) => (
                            <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#fcfcfc' } }}>
                                <TableCell sx={{ fontSize: '13px', color: '#333' }}>
                                    {criteriaName}
                                </TableCell>
                                {/* Score Field Styling */}
                                <TableCell align="center">
                                    <TextField
                                        select
                                        value={formData.scores?.[criteriaName] || ''}
                                        onChange={(e) => handleScoreChange(criteriaName, e.target.value)}
                                        size="small"
                                        variant="standard"
                                        InputProps={{
                                            disableUnderline: true,
                                            style: { fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }
                                        }}
                                        sx={{
                                            width: '50px',
                                            backgroundColor: '#fff',
                                            borderRadius: 1,
                                            border: '1px solid #ddd',
                                            py: 0.5
                                        }}
                                    >
                                        <MenuItem value="">-</MenuItem>
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <MenuItem key={score} value={score} sx={{ justifyContent: 'center' }}>{score}</MenuItem>
                                        ))}
                                    </TextField>
                                </TableCell>
                                {/* Remarks Field Styling */}
                                <TableCell>
                                    <TextField
                                        value={formData.remarks?.[criteriaName] || ''}
                                        onChange={(e) => handleRemarkChange(criteriaName, e.target.value)}
                                        multiline
                                        fullWidth
                                        variant="standard"
                                        placeholder="Add remark..."
                                        InputProps={{
                                            disableUnderline: true,
                                            style: { fontSize: '13px' }
                                        }}
                                        sx={{
                                            wordBreak: 'break-word',
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Footer / Ratings Section */}
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>
                    Overall Rating
                </Typography>

                {/* Colorful Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    {ratings.map((opt) => {
                        const isSelected = formData.overallRating === opt.value;
                        return (
                            <Chip
                                key={opt.value}
                                label={opt.label}
                                onClick={() => handleOverallRatingChange(opt.value)}
                                color={isSelected ? opt.color : 'default'}
                                variant={isSelected ? "filled" : "outlined"}
                                // Using DoneIcon and CloseIcon for Excellent and Rejected
                                icon={isSelected && opt.value === 'Excellent' ? <DoneIcon /> : (isSelected && opt.value === 'Rejected' ? <CloseIcon /> : undefined)}
                                sx={{
                                    fontWeight: isSelected ? 'bold' : 'normal',
                                    border: isSelected ? 'none' : '1px solid #bdbdbd',
                                    backgroundColor: isSelected ? undefined : 'transparent',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: isSelected ? undefined : '#f5f5f5'
                                    }
                                }}
                            />
                        )
                    })}
                </Box>

                <TextField
                    label="Final Verdict / Remarks"
                    value={formData.finalVerdict || ''}
                    onChange={(e) => handleFinalVerdictChange(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    variant="outlined"
                    placeholder="Enter final summary..."
                    InputProps={{ style: { fontSize: '14px' } }}
                    sx={{ backgroundColor: '#fff' }}
                />
            </Paper>
        </Box>
    );
}