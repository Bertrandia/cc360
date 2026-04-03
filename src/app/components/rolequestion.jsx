import React from "react";

const fontStyle = { fontFamily: 'NeuzeitGro, "Inter", sans-serif' };

const RoleQuestions = ({ open, onClose, role }) => {
    const roleQuestionsMap = {
        "Housekeeping": [
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
            "What cuisines do you most confident in cooking?",
            "What dishes can you prepare for breakfast, lunch, and dinner?",
            "How do you ensure hygiene while cooking?",
            "How do you handle client-specific dietary preferences or allergies?",
            "How do you ensure taste consistency daily?",
            "How do you plan a balanced meal for a family of four?",
            "What's the difference between North Indian and South Indian cooking styles?",
            "How do you store leftovers safely?"
        ],
        "Cook/Chef": [
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
        "Childcare Associate": [
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
            "How do you maintain vehicle cleanliness?",
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
            "What are the etiquettes of serving VIP guests?",
            "How do you prepare for a formal event or dinner?",
            "What is your grooming standard as a Butler?"
        ],
        "Governance": [
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
        ]
    };

    const questions = roleQuestionsMap[role] || [];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-[#0F0F10]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div
                className="w-full max-w-2xl bg-white rounded-2xl border border-[#EFEFEF] shadow-[0_18px_60px_rgba(0,0,0,0.14)] overflow-hidden flex flex-col max-h-[90vh]"
                style={fontStyle}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] bg-white/85">
                    <div className="flex flex-col">
                        <span className="text-[18px] font-semibold text-[#2C2C2C] tracking-tight">
                            {role ? `${role} - Interview Questions` : 'Interview Questions'}
                        </span>
                        <span className="text-xs text-[#7A7A7A]">Guided prompts for this primary role</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[#F2F2F2] transition-colors"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#F7F7F7]">
                    {questions.length > 0 ? (
                        <div className="space-y-3">
                            {questions.map((question, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-4 rounded-xl border border-[#EFEFEF] shadow-[0_6px_20px_rgba(0,0,0,0.05)] flex gap-3"
                                >
                                    <span className="text-[#F36A23] font-semibold text-base leading-6">
                                        {index + 1}.
                                    </span>
                                    <p className="text-[#2F2F2F] text-sm leading-relaxed">{question}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl border border-[#EFEFEF] shadow-inner">
                            <p className="text-[#5A5A5A] text-base font-medium">No specific questions available for this role.</p>
                            <p className="text-[#8A8A8A] text-sm mt-2">
                                Role: <span className="font-semibold text-[#3C3C3C]">{role || 'Unknown'}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-[#F0F0F0] bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-[#F36A23] shadow-[0_8px_24px_rgba(243,106,35,0.32)] hover:bg-[#e45f1d] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleQuestions;