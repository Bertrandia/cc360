// Simple SMS Notification Utility (Free - Using Fast2SMS)

export const sendSMSNotification = async (phoneNumber, message) => {
    try {
        // Clean phone number (remove spaces, special chars)
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        // Ensure it's a 10-digit Indian number
        const finalPhone = cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10);

        console.log('📱 Sending SMS to:', finalPhone);
        console.log('📝 Message:', message);

        // Call API route to send SMS
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: finalPhone,
                message: message
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send SMS');
        }

        const result = await response.json();
        console.log('✅ SMS sent successfully:', result);
        return result;

    } catch (error) {
        console.error('❌ Error sending SMS:', error);
        throw error;
    }
};

// Create notification message for resource allocation
export const createResourceAllocationSMS = (candidateName, requestID) => {
    // Keep SMS under 160 characters for single SMS
    return `Resource Allocated! Candidate: ${candidateName}, Request ID: ${requestID}. Thank you for using our service.`;
};

// Alternative longer message (will be 2 SMS)
export const createDetailedResourceAllocationSMS = (candidateName, requestID, taskDate, taskTime) => {
    return `Resource Allocated Successfully!
Candidate: ${candidateName}
Request ID: ${requestID}
Date: ${taskDate}
Time: ${taskTime}
Thank you!`;
};