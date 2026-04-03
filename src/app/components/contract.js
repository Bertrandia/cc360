// Part 1 of 2
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';

const ContractPreviewDialog = ({
    open,
    onClose,
    formData,
    patronData,
    onDownload
}) => {
    const currentDate = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const contractDate = patronData?.contractCreatedAt
        ? new Date(
            patronData.contractCreatedAt.toDate
                ? patronData.contractCreatedAt.toDate()
                : patronData.contractCreatedAt
        )
        : currentDate;

    const contractDay = contractDate.getDate();
    const contractMonth = monthNames[contractDate.getMonth()];
    const contractYear = contractDate.getFullYear();

    // Helper to show fallback underscores for empty strings
    const textOrUnderscore = (val) => (val && String(val).trim() !== '' ? val : '_____________________');

    // Global print-friendly small font & spacing: we will apply via inline styles and CSS below
    // Keep all logic and data flow unchanged.

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                style: {
                    maxHeight: '95vh',
                }
            }}
        >
            <DialogTitle sx={{
                backgroundColor: '#fff',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '0.95rem' }}>MEMORANDUM OF UNDERSTANDING (MOU) — PREVIEW</span>
                <Button
                    variant="contained"
                    onClick={() => window.print()}
                    sx={{
                        backgroundColor: '#d32f2f',
                        color: '#fff',
                        '&:hover': {
                            backgroundColor: '#b71c1c'
                        }
                    }}
                >
                    📥 DOWNLOAD PDF
                </Button>
            </DialogTitle>

            <DialogContent
                id="contract-content"
                style={{
                    paddingTop: "8px",
                    backgroundColor: '#fff',
                    // Set default document font & baseline sizes to match legal PDF
                    fontFamily: '"Times New Roman", Times, serif',
                    color: '#000',
                    fontSize: '12px',
                    lineHeight: 1.35
                }}
            >
                {/* Contract Document wrapper - centered and constrained for A4-like width */}
                <Box sx={{ maxWidth: '820px', margin: '0 auto', padding: '24px' }}>

                    {/* ---- Header: Logo + CARE CREW text (centered) ---- */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        {/* logo path as requested */}
                        <img src="/logo.png" alt="CareCrew Logo" style={{ width: 110, display: 'block', margin: '0 auto 6px auto' }} />
                        <Typography sx={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.6px' }}>CARE CREW</Typography>
                    </Box>

                    {/* Title */}
                    <Typography align="center" sx={{ fontWeight: 'bold', fontSize: '16px', mb: 10 / 8 }}>
                        MEMORANDUM OF UNDERSTANDING (MOU)
                    </Typography>

                    {/* Opening line */}
                    <Typography variant="body1" sx={{ mb: 2, textAlign: 'left' }}>
                        This Memorandum of Understanding (“MOU”) is executed on this <strong>{contractDay}</strong> day of <strong>{contractMonth}</strong>, <strong>{contractYear}</strong>.
                    </Typography>

                    {/* Parties */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        BY AND BETWEEN
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.35 }}>
                        <strong>CARE CREW</strong>, a manpower sourcing, training and deployment company, having its registered office at 36, Sector-26A, DLF Phase 1, Gurugram-122002. (hereinafter referred to as “CARE CREW” or “Service Provider”),
                    </Typography>

                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>
                        AND
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.35 }}>
                        Mr./Mrs./Ms./M/s. <strong>{textOrUnderscore(patronData?.patronName)}</strong>, residing/located at <strong>{textOrUnderscore(patronData?.patronAddress)}</strong>
                        (hereinafter referred to as “Customer” or “Hirer”). Both collectively referred to as the “Parties”
                    </Typography>

                    {/* Section 1 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        1. PURPOSE OF THIS MOU
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        The Customer wishes to engage CARE CREW to source, train, and deploy domestic Associates such as housekeepers, cooks, nannies, caregivers, drivers, home managers, butlers, pet-care personnel, and similar manpower roles. This MOU outlines the terms, responsibilities, fees, and service conditions agreed between the Parties.
                    </Typography>

                    {/* Section 2 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        2. NATURE OF SERVICE
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW is only a facilitator who handles manpower sourcing, verification, training, and deployments.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The Associate deployed is not an employee of CARE CREW. Nothing in this MOU shall be construed as creating an employer–employee relationship between CARE CREW and the Associate. If any, all statutory liabilities (ESI, PF, Minimum Wages etc.) arising from the Customer–Associate relationship are solely the Customer’s responsibility.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW provides end-to-end support, including trials, deployment documentation, contract signing, and replacements as per policy.</Typography>
                    </Box>

                    {/* Section 3 */}
                    <Typography variant="body1" sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        mt: 2,
                        pageBreakBefore: 'always',   // force heading on new page
                        pageBreakInside: 'avoid'     // never detach heading from points
                    }}>
                        3. SERVICE SCOPE
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW will source suitable Associate profiles based on Customer requirements.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW will conduct screening, background checks, skill assessments, and trials.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW will initiate the Aadhaar, Criminal background check after deployment of the candidate. However, CARE CREW will keep the documentation ready for the associate even before customer trials.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Background verification is dependent on third-party and government sources. CARE CREW is not liable for delays, inaccuracies, or unavailability of record.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW shall not be liable for loss or misuse of the Associate’s personal documents once submitted to the Customer.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Upon final selection, CARE CREW will deploy the selected Associate and facilitate contract signing.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• This MOU is non-transferable, and reporting venue will not be changed. Associates shall be deployed only at the address mentioned in the MOU. Multi-house deployment or shift to another family is strictly prohibited.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Associate details as per Annexure I</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Any additional duties outside the agreed job description shall require mutual consent and may attract additional charges.</Typography>
                    </Box>

                    {/* Section 4 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        4. REGISTRATION FEES & CHARGES
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Customer shall pay a Rs.2,000 Registration Fee before sourcing begins.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW will provide up to 3 trial candidates under this fee.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• If the Customer rejects all 3, the registration fee is non-refundable, and Customer must pay an additional Rs.2,000 to continue further sourcing.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Customer has to select or reject the candidate post-trial as the candidate will not be kept on hold.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• If CARE CREW does not source any candidate for trial, the registration fee will be refunded.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• If the customer tries to hire the candidate directly after trial, CARE CREW will not be responsible for any documentation, background checks & replacements.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Upon final selection, Customer must pay 50% of one month’s salary of the Associate to CARE CREW as the service fee. Amount as per the Annexure II.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The registration fee will be adjusted against this service fee.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• All amounts are exclusive of GST.</Typography>
                    </Box>

                    {/* Section 5 */}
                    <Typography variant="body1" sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        mt: 2,
                        pageBreakBefore: 'always',   // force heading on new page
                        pageBreakInside: 'avoid'     // never detach heading from points
                    }}>
                        5. PAYMENT TERMS
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The remaining service fee is payable after the 3-day trial and before deployment.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The Customer must sign the deployment contract facilitated by CARE CREW and pay the service fee to start the services.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Any training charges (virtual or physical) must be paid as per Annexure III.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The routine monthly billing cycle for Associate salary will be from 1st day of the month to the last day of month.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Customer shall pay the monthly salary directly to Associate between 1st to 7th day of the subsequent month.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW is not liable for salary delays by the Customer. In case of default, CARE CREW may withdraw the Associate without notice.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• All fees paid to CARE CREW are non-refundable under all circumstances, including but not limited to Associate resignation, replacement delays, Customer dissatisfaction.</Typography>
                    </Box>

                    {/* Section 6 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        6. TRIAL POLICY
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Trials at the customer place are paid trials, irrespective of the number of days and irrespective of the outcome of the trial.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Customer must confirm interview/trial within 48 hours of receiving profiles.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW is not liable for delays in trials caused by the Customer.</Typography>
                    </Box>

                    {/* Section 7 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        7. REPLACEMENT POLICY
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• If the Customer is not satisfied by the services of the chosen Associate, or if the Associate leaves the job within the period of MOU, then the Service Provider will replace the existing Associate, and this will be done only Three (3) times in the period of MOU.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Replacements do not restart the MOU tenure. The maximum replacements allowed are three (3) within the same MOU period irrespective of reason.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Service Provider will provide replacements within up to 15 days.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Replacements are not provided in cases of:</Typography>
                        <Typography variant="body1" sx={{ mb: 0.4, pl: 3 }}>o Misbehaviour by Customer</Typography>
                        <Typography variant="body1" sx={{ mb: 0.4, pl: 3 }}>o Hostile or unsafe work environment</Typography>
                        <Typography variant="body1" sx={{ mb: 0.4, pl: 3 }}>o Direct hiring/poaching attempts</Typography>
                        <Typography variant="body1" sx={{ mb: 0.4, pl: 3 }}>o Salary not paid on time</Typography>
                    </Box>

                    {/* Section 8 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        8. CUSTOMER RESPONSIBILITIES
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Provide a safe, respectful, and non-abusive environment to the Associate.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Provide accurate job details including shift timings, duties, and accommodation if applicable.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Provide the proper accommodation & food in case of live-in arrangement.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Provide Associate at least 2 leaves per month. Or long leaves in case of live-in. Weekly off will be given on any day of the week decided mutually by Hirer & Associate.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Festival leaves & National holidays will be paid leaves and that can be encashed or mutually decided by Hirer & Associate.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW may immediately withdraw the Associate if the workplace is found unsafe, abusive, or violates human dignity. No refunds or replacements will be applicable in such cases.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Immediately inform CARE CREW of: Associate absence, Misconduct, Safety issues, Damage or incident.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Pay Overtime & Bonus wherever applicable.</Typography>
                    </Box>

                    {/* Section 9 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        9. CARE CREW RESPONSIBILITIES
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Conduct identity and background verification.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Initiate police verification wherever required.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Provide virtual or in-person training as needed.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Facilitate deployment documentation.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Support with dispute resolution between Customer and Associate.</Typography>
                    </Box>

                    {/* Continue in Part 2 */}

                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        10. DAMAGE, INCIDENT & LIABILITY
                    </Typography>
                    <Box sx={{ mb: 1.5, pl: 2 }}>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The service provider will not be responsible for any dispute between Hirer & Associate.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW is not liable for theft, damage to property, loss, injury, or accidents at Customer premises.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• Any damage caused by negligence or misconduct of the Associate is the Associate’s responsibility.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• CARE CREW shall not be responsible for consequential damages under any circumstances.</Typography>
                        <Typography variant="body1" sx={{ mb: 0.6 }}>• The Customer shall indemnify and hold harmless CARE CREW, its employees, officers, and representatives from any claims, losses, damages, penalties, liabilities, or expenses arising from (i) acts or omissions of the Associate, (ii) Customer’s breach of this MOU, (iii) disputes between Customer and Associate, (iv) any civil or criminal liabilities arising at the Customer premises.</Typography>
                    </Box>

                    {/* Section 11 */}
                    <Typography variant="body1" sx={{
                        fontWeight: 'bold', mb: 1, mt: 2,
                        pageBreakBefore: 'always',   // force heading on new page
                        pageBreakInside: 'avoid'
                    }}>
                        11. NON-SOLICITATION / NO POACHING
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        • The Customer shall not directly hire or engage the Associate for 12 months after termination. • Violation shall result in a penalty equal to 3 months of the Associate’s salary, payable to CARE CREW.
                    </Typography>

                    {/* Section 12 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        12. CONFIDENTIALITY
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        • Both Parties shall maintain confidentiality of all shared personal, operational, and financial information. • CARE CREW’s processes, data, and internal documents shall not be shared externally.
                    </Typography>

                    {/* Section 13 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        13. VALIDITY
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        This MOU is valid for 6 months from the date of signing and may be renewed with mutual agreement. The customer can terminate the MOU by giving a 15days notice to the associate.
                    </Typography>

                    {/* Section 14 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        14. GOVERNING LAW & JURISDICTION
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        This MOU shall be governed by the laws of India. Courts at Gurgaon, Haryana shall have exclusive jurisdiction.
                    </Typography>

                    {/* Section 15 */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
                        15. ACCEPTANCE OF TERMS
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        By signing this MOU, the Customer confirms that they have read, understood, and agreed to all terms, fees, and policies of CARE CREW.
                    </Typography>

                    {/* --- SIGNATURE BLOCK (above Annexures) --- */}
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>SIGNATURES</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Box>
                                <Typography variant="body1">For Customer</Typography>
                                <Typography variant="body1" sx={{ mt: 3 }}>Signature: _______________________</Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>Date: ____________________________</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body1">For CARE CREW</Typography>
                                <Typography variant="body1" sx={{ mt: 3 }}>Signature: ______________________</Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>Date: __________________________</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* -------------------------------------------------------------
   ANNEXURES START HERE — ALL FIXED TO MATCH LEGAL PDF EXACTLY
-------------------------------------------------------------- */}

                    {/* -------------------- ANNEXURE I -------------------- */}
                    <Box className="annexures" sx={{
                        mt: 3,
                        pageBreakBefore: 'always',     // start annexures on a fresh page
                        pageBreakInside: 'avoid'       // keep all annexures together
                    }}>
                        <Box sx={{ mt: 3, pageBreakInside: 'avoid', mb: 3 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Annexure I
                            </Typography>

                            <TableContainer component={Paper} sx={{
                                mb: 2,
                                border: '1px solid #000',
                                boxShadow: 'none'
                            }}>
                                <Table sx={{
                                    borderCollapse: 'collapse',
                                    '& td, & th': {
                                        border: '1px solid #000 !important',
                                        padding: '6px 6px',
                                        fontSize: '12px',
                                        lineHeight: 1.3
                                    }
                                }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>S No</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '38%' }}>Particular</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '50%' }}>Details</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        <TableRow>
                                            <TableCell>a.</TableCell>
                                            <TableCell>Name of the Associate</TableCell>
                                            <TableCell>{formData.associateName || '_____________________'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>b.</TableCell>
                                            <TableCell>Working Arrangement (Hours)</TableCell>
                                            <TableCell>{formData.workingArrangement || '_____________________'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>c.</TableCell>
                                            <TableCell>Associate&apos;s Monthly Dues</TableCell>

                                            <TableCell>{formData.monthlyDues || '_____________________'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>d.</TableCell>
                                            <TableCell>Scope of Work</TableCell>
                                            <TableCell>{formData.scopeOfWork || '_____________________'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>e.</TableCell>
                                            <TableCell>Date of Deployment</TableCell>
                                            <TableCell>
                                                {formData.deploymentDate
                                                    ? new Date(formData.deploymentDate).toLocaleDateString('en-GB')
                                                    : '_____________________'}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        {/* -------------------- ANNEXURE II -------------------- */}
                        <Box sx={{ mt: 3, pageBreakInside: 'avoid', mb: 3 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Annexure II
                            </Typography>

                            <TableContainer component={Paper} sx={{
                                mb: 2,
                                border: '1px solid #000',
                                boxShadow: 'none'
                            }}>
                                <Table sx={{
                                    borderCollapse: 'collapse',
                                    '& td, & th': {
                                        border: '1px solid #000 !important',
                                        padding: '6px 6px',
                                        fontSize: '12px',
                                        lineHeight: 1.3
                                    }
                                }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>S No</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '38%' }}>Type of Payment</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Amount</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '32%' }}>Timing</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        <TableRow>
                                            <TableCell>a.</TableCell>
                                            <TableCell>Registration Fee</TableCell>
                                            <TableCell>Rs. 2,000</TableCell>
                                            <TableCell>Before Starting Recruitment</TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>b.</TableCell>
                                            <TableCell>Recruitment Fee (50% Monthly Salary – Registration Fee)</TableCell>
                                            <TableCell>{formData.recruitmentFee || '_____________________'}</TableCell>
                                            <TableCell>After trial & before deployment</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        {/* -------------------- ANNEXURE III -------------------- */}
                        <Box sx={{ mt: 3, pageBreakInside: 'avoid', mb: 3 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Annexure III
                            </Typography>

                            <TableContainer component={Paper} sx={{
                                mb: 2,
                                border: '1px solid #000',
                                boxShadow: 'none'
                            }}>
                                <Table sx={{
                                    borderCollapse: 'collapse',
                                    '& td, & th': {
                                        border: '1px solid #000 !important',
                                        padding: '6px 6px',
                                        fontSize: '12px',
                                        lineHeight: 1.3
                                    }
                                }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>S No</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '46%' }}>Type of Training</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '14%' }}>Duration</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>Charges</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        <TableRow>
                                            <TableCell>a.</TableCell>
                                            <TableCell>Virtual Training (Mandatory for remote locations)</TableCell>
                                            <TableCell>Up to 2 hrs</TableCell>
                                            <TableCell>Rs. 500</TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>b.</TableCell>
                                            <TableCell>In-person Training (Client’s place)</TableCell>
                                            <TableCell>Up to 2 hrs</TableCell>
                                            <TableCell>Rs. 1,000</TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>c.</TableCell>
                                            <TableCell>In-person Training (CARE CREW office)</TableCell>
                                            <TableCell>Up to 2 hrs</TableCell>
                                            <TableCell>Rs. 500 / day</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Box>

                    {/* ---- Final Signatures (for print) ---- */}
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="body1" sx={{ mb: 2 }}>For Customer</Typography>
                                <Typography variant="body1">Signature: _______________________</Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>Date: ____________________________</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body1" sx={{ mb: 2 }}>For CARE CREW</Typography>
                                <Typography variant="body1">Signature: ______________________</Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>Date: __________________________</Typography>
                            </Box>
                        </Box>
                    </Box>

                </Box>
            </DialogContent>

            <DialogActions style={{
                backgroundColor: '#fff',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ color: "#757575", borderColor: "#bdbdbd", width: "120px" }}
                >
                    CLOSE
                </Button>
                <Button
                    onClick={() => window.print()}
                    variant="contained"
                    sx={{ backgroundColor: "#d32f2f", color: "#fff" }}
                >
                    📥 DOWNLOAD PDF
                </Button>
            </DialogActions>

            {/* PRINT RULES */}
            <style jsx global>{`
    @media print {

        /* remove browser headers & footers */
        @page {
            margin: 14mm !important;
            size: A4;
        }

        body * {
            visibility: hidden;
        }

        #contract-content, #contract-content * {
            visibility: visible;
        }

        #contract-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
        }

        table, tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
    }
`}</style>

        </Dialog>
    );
};

export default ContractPreviewDialog;