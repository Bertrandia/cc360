'use client';

import React from 'react';

// Simple Select Component (copy from your main file or import)
function SimpleSelect({ label, placeholder = 'Select', items, value, onChange, required = false }) {
    const [open, setOpen] = React.useState(false);
    const [highlightIndex, setHighlightIndex] = React.useState(-1);
    const containerRef = React.useRef(null);
    const listRefs = React.useRef([]);

    React.useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const selectedLabel = React.useMemo(() => {
        if (value === null || value === undefined || value === '') return '';
        const found = (items || []).find((it) => {
            const itemValue = it?.value ?? it;
            if (typeof itemValue === 'boolean' && typeof value === 'boolean') {
                return itemValue === value;
            }
            return String(itemValue) === String(value);
        });
        if (!found) return String(value);
        return String(found?.label ?? found);
    }, [items, value]);

    React.useEffect(() => {
        if (open) {
            setHighlightIndex(items && items.length ? 0 : -1);
        } else {
            setHighlightIndex(-1);
        }
    }, [open, items]);

    React.useEffect(() => {
        if (highlightIndex >= 0 && listRefs.current[highlightIndex]) {
            try { listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' }); } catch (e) { }
        }
    }, [highlightIndex]);

    const onKeyDown = (e) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, (items || []).length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            setHighlightIndex(0);
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            setHighlightIndex((items || []).length - 1);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const itm = (items || [])[highlightIndex];
            if (itm) {
                const val = itm?.value ?? itm;
                onChange(val);
            }
            setOpen(false);
            return;
        }
    };

    return (
        <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full text-left border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between"
                    tabIndex={0}
                >
                    <span>{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>

                {open && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <ul className="max-h-56 overflow-auto" role="listbox">
                            {(items || []).map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                return (
                                    <li
                                        key={String(val)}
                                        ref={(el) => (listRefs.current[idx] = el)}
                                        className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''}`}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        onMouseDown={(ev) => { ev.preventDefault(); }}
                                        onClick={() => { onChange(val); setOpen(false); }}
                                        role="option"
                                        aria-selected={highlighted}
                                    >
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper function to determine role type
const getRoleType = (role) => {
    if (!role) return null;
    const r = role.toLowerCase();

    if (r.includes('housekeeper') && r.includes('cook')) return 'hk-cook';
    if (r.includes('housekeeper') && r.includes('nanny')) return 'hk-nanny';
    if (r.includes('housekeeper')) return 'housekeeper';
    if (r.includes('cook') && r.includes('nanny')) return 'nanny-cook';
    if (r.includes('cook') || r.includes('chef')) return 'cook';
    if (r.includes('driver') || r.includes('chauffeur')) return 'driver';
    if (r.includes('nanny')) return 'nanny';
    if (r.includes('gardener')) return 'gardener';
    if (r.includes('security')) return 'security';
    if (r.includes('pet')) return 'pet';
    if (r.includes('elder')) return 'eldercare';
    if (r.includes('runner') || r.includes('errand') || r.includes('house boy')) return 'runner';
    if (r.includes('butler') || r.includes('manager') || r.includes('front office')) return 'manager';
    if (r.includes('helper') || r.includes('kst') || r.includes('utility')) return 'helper';

    return null;
};

// Main Component
export default function RoleSpecificFields({ selectedPrimaryRole, fields, setFields }) {
    const roleType = getRoleType(selectedPrimaryRole);

    if (!roleType) return null;

    return (
        <>
            <div className="md:col-span-2 xl:col-span-3 mt-4">
                <h3 className="text-md font-semibold text-gray-700 border-b pb-2">
                    Role-Specific Requirements
                </h3>
            </div>

            {/* HOUSEKEEPER FIELDS */}
            {(roleType === 'housekeeper' || roleType === 'hk-cook' || roleType === 'hk-nanny' || roleType === 'helper') && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">House Size</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 3 BHK / 1500 sq.ft"
                            value={fields.houseSize}
                            onChange={(e) => setFields({ ...fields, houseSize: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Cleaning Frequency"
                            placeholder="Select"
                            items={[
                                { label: 'Daily', value: 'Daily' },
                                { label: 'Alternate Days', value: 'Alternate Days' },
                                { label: 'Weekly Deep Clean', value: 'Weekly Deep Clean' }
                            ]}
                            value={fields.cleaningFrequency}
                            onChange={(v) => setFields({ ...fields, cleaningFrequency: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Cleaning Scope</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Bathrooms, balconies, wardrobes, etc."
                            value={fields.cleaningScope}
                            onChange={(e) => setFields({ ...fields, cleaningScope: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Laundry Responsibilities</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Washing, ironing, etc."
                            value={fields.laundryResponsibilities}
                            onChange={(e) => setFields({ ...fields, laundryResponsibilities: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Kitchen & Utensil Cleaning"
                            placeholder="Select"
                            items={[
                                { label: 'Included', value: 'Included' },
                                { label: 'Excluded', value: 'Excluded' }
                            ]}
                            value={fields.kitchenCleaning}
                            onChange={(v) => setFields({ ...fields, kitchenCleaning: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Time Preference"
                            placeholder="Select"
                            items={[
                                { label: 'Morning', value: 'Morning' },
                                { label: 'Evening', value: 'Evening' },
                                { label: 'Flexible', value: 'Flexible' }
                            ]}
                            value={fields.timePreference}
                            onChange={(v) => setFields({ ...fields, timePreference: v })}
                        />
                    </div>
                </>
            )}

            {/* COOK FIELDS */}
            {(roleType === 'cook' || roleType === 'hk-cook' || roleType === 'nanny-cook') && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Cuisine Type</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="North Indian, South Indian, etc."
                            value={fields.cuisineType}
                            onChange={(e) => setFields({ ...fields, cuisineType: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Meals Per Day</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 2 or 3"
                            value={fields.mealsPerDay}
                            onChange={(e) => setFields({ ...fields, mealsPerDay: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Grocery Management"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.groceryManagement}
                            onChange={(v) => setFields({ ...fields, groceryManagement: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Food Type"
                            placeholder="Select"
                            items={[
                                { label: 'Veg', value: 'Veg' },
                                { label: 'Non-Veg', value: 'Non-Veg' },
                                { label: 'Both', value: 'Both' }
                            ]}
                            value={fields.foodType}
                            onChange={(v) => setFields({ ...fields, foodType: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Serving Expectations</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="Family-style / Plated"
                            value={fields.servingExpectations}
                            onChange={(e) => setFields({ ...fields, servingExpectations: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Health-Based Food Requirements</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Dietary restrictions or health requirements"
                            value={fields.healthBasedFood}
                            onChange={(e) => setFields({ ...fields, healthBasedFood: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Meal Timing</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 8 AM, 1 PM, 8 PM"
                            value={fields.mealTiming}
                            onChange={(e) => setFields({ ...fields, mealTiming: e.target.value })}
                        />
                    </div>
                </>
            )}

            {/* COMBINED ROLES (HK+COOK) */}
            {roleType === 'hk-cook' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Priority Expectation"
                            placeholder="Select"
                            items={[
                                { label: 'Cleaning Priority', value: 'Cleaning' },
                                { label: 'Cooking Priority', value: 'Cooking' },
                                { label: 'Equal', value: 'Equal' }
                            ]}
                            value={fields.priorityExpectation}
                            onChange={(v) => setFields({ ...fields, priorityExpectation: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Duty Sequence</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="e.g., Cook first, then clean"
                            value={fields.dutySequence}
                            onChange={(e) => setFields({ ...fields, dutySequence: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Veg/Non-Veg Separation"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.vegNonVegSeparation}
                            onChange={(v) => setFields({ ...fields, vegNonVegSeparation: v })}
                        />
                    </div>
                </>
            )}

            {/* DRIVER FIELDS */}
            {roleType === 'driver' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Vehicle Type"
                            placeholder="Select"
                            items={[
                                { label: 'Manual', value: 'Manual' },
                                { label: 'Automatic', value: 'Automatic' },
                                { label: 'Luxury Manual', value: 'Luxury Manual' },
                                { label: 'Luxury Automatic', value: 'Luxury Automatic' },
                                { label: 'Both', value: 'Both' }
                            ]}
                            value={fields.vehicleType}
                            onChange={(v) => setFields({ ...fields, vehicleType: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Purpose</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Office commute, school, errands, outstation"
                            value={fields.drivingPurpose}
                            onChange={(e) => setFields({ ...fields, drivingPurpose: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Shift Duration</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 8 hours, on-call"
                            value={fields.shiftDuration}
                            onChange={(e) => setFields({ ...fields, shiftDuration: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Night/Outstation Readiness"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.nightOutstationReadiness}
                            onChange={(v) => setFields({ ...fields, nightOutstationReadiness: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Additional Tasks</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Vehicle cleaning, maintenance, etc."
                            value={fields.additionalTasksDriver}
                            onChange={(e) => setFields({ ...fields, additionalTasksDriver: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Vehicle Ownership"
                            placeholder="Select"
                            items={[
                                { label: 'Customer Owned', value: 'Customer' },
                                { label: 'Company Owned', value: 'Company' }
                            ]}
                            value={fields.vehicleOwnership}
                            onChange={(v) => setFields({ ...fields, vehicleOwnership: v })}
                        />
                    </div>
                </>
            )}

            {/* NANNY FIELDS */}
            {(roleType === 'nanny' || roleType === 'hk-nanny' || roleType === 'nanny-cook') && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Child Age(s)</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 2 years, 5 years"
                            value={fields.childAge}
                            onChange={(e) => setFields({ ...fields, childAge: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Nanny Duties</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Feeding, bathing, diapering, bedtime, tutoring"
                            value={fields.nannyDuties}
                            onChange={(e) => setFields({ ...fields, nannyDuties: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Day or Live-in"
                            placeholder="Select"
                            items={[
                                { label: 'Day Only', value: 'Day' },
                                { label: 'Live-in', value: 'Live-in' }
                            ]}
                            value={fields.dayOrLiveIn}
                            onChange={(v) => setFields({ ...fields, dayOrLiveIn: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Parent Presence"
                            placeholder="Select"
                            items={[
                                { label: 'WFH', value: 'WFH' },
                                { label: 'Office', value: 'Office' },
                                { label: 'Mixed', value: 'Mixed' }
                            ]}
                            value={fields.parentPresence}
                            onChange={(v) => setFields({ ...fields, parentPresence: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Night Duty Required"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.nightDuty}
                            onChange={(v) => setFields({ ...fields, nightDuty: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="First Aid Knowledge"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' },
                                { label: 'Preferred', value: 'Preferred' }
                            ]}
                            value={fields.firstAidKnowledge}
                            onChange={(v) => setFields({ ...fields, firstAidKnowledge: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Travel Flexibility"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.travelFlexibility}
                            onChange={(v) => setFields({ ...fields, travelFlexibility: v })}
                        />
                    </div>

                    {roleType === 'nanny-cook' && (
                        <>
                            <div className="md:col-span-1 xl:col-span-2">
                                <label className="block text-sm font-medium mb-1 text-gray-700">Role Split</label>
                                <textarea
                                    className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                                    placeholder="e.g., 70% childcare, 30% cooking"
                                    value={fields.roleSplit}
                                    onChange={(e) => setFields({ ...fields, roleSplit: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-1 xl:col-span-1">
                                <label className="block text-sm font-medium mb-1 text-gray-700">Child Dietary Restrictions</label>
                                <textarea
                                    className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                                    placeholder="Allergies or restrictions"
                                    value={fields.childDietaryRestrictions}
                                    onChange={(e) => setFields({ ...fields, childDietaryRestrictions: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                </>
            )}

            {/* GARDENER FIELDS */}
            {roleType === 'gardener' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Garden Type/Size</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="Pots, lawn, landscape"
                            value={fields.gardenType}
                            onChange={(e) => setFields({ ...fields, gardenType: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Scope</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Watering, pruning, planting, landscaping"
                            value={fields.gardenScope}
                            onChange={(e) => setFields({ ...fields, gardenScope: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Tools Provided"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.toolsProvided}
                            onChange={(v) => setFields({ ...fields, toolsProvided: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Frequency"
                            placeholder="Select"
                            items={[
                                { label: 'Daily', value: 'Daily' },
                                { label: 'Alternate Days', value: 'Alternate Days' },
                                { label: 'Weekly', value: 'Weekly' }
                            ]}
                            value={fields.gardenFrequency}
                            onChange={(v) => setFields({ ...fields, gardenFrequency: v })}
                        />
                    </div>
                </>
            )}

            {/* SECURITY GUARD FIELDS */}
            {roleType === 'security' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Shift Type"
                            placeholder="Select"
                            items={[
                                { label: '12 Hours', value: '12' },
                                { label: '24 Hours', value: '24' },
                                { label: 'Other', value: 'Other' }
                            ]}
                            value={fields.shiftType}
                            onChange={(v) => setFields({ ...fields, shiftType: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Location Type"
                            placeholder="Select"
                            items={[
                                { label: 'Residential', value: 'Residential' },
                                { label: 'Gated Society', value: 'Gated Society' },
                                { label: 'Commercial', value: 'Commercial' }
                            ]}
                            value={fields.locationType}
                            onChange={(v) => setFields({ ...fields, locationType: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Duties</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Visitor log, CCTV monitoring, deliveries"
                            value={fields.securityDuties}
                            onChange={(e) => setFields({ ...fields, securityDuties: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Uniform & Equipment"
                            placeholder="Select"
                            items={[
                                { label: 'Provided', value: 'Provided' },
                                { label: 'Not Provided', value: 'Not Provided' }
                            ]}
                            value={fields.uniformProvision}
                            onChange={(v) => setFields({ ...fields, uniformProvision: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Armed/Unarmed"
                            placeholder="Select"
                            items={[
                                { label: 'Armed', value: 'Armed' },
                                { label: 'Unarmed', value: 'Unarmed' }
                            ]}
                            value={fields.armedUnarmed}
                            onChange={(v) => setFields({ ...fields, armedUnarmed: v })}
                        />
                    </div>
                </>
            )}

            {/* PET CARETAKER FIELDS */}
            {roleType === 'pet' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Type & Number of Pets</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm" placeholder="e.g., 2 dogs, 1 cat"
                            value={fields.petType}
                            onChange={(e) => setFields({ ...fields, petType: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Tasks</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Walking, feeding, bathing, vet visits"
                            value={fields.petTasks}
                            onChange={(e) => setFields({ ...fields, petTasks: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Day/Night Coverage"
                            placeholder="Select"
                            items={[
                                { label: 'Day Only', value: 'Day' },
                                { label: 'Night Only', value: 'Night' },
                                { label: 'Both', value: 'Both' }
                            ]}
                            value={fields.petCoverage}
                            onChange={(v) => setFields({ ...fields, petCoverage: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Breed Experience Required"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.breedExperience}
                            onChange={(v) => setFields({ ...fields, breedExperience: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Indoor/Outdoor Handling"
                            placeholder="Select"
                            items={[
                                { label: 'Indoor Only', value: 'Indoor' },
                                { label: 'Outdoor Only', value: 'Outdoor' },
                                { label: 'Both', value: 'Both' }
                            ]}
                            value={fields.indoorOutdoor}
                            onChange={(v) => setFields({ ...fields, indoorOutdoor: v })}
                        />
                    </div>
                </>
            )}

            {/* ELDERCARE FIELDS */}
            {roleType === 'eldercare' && (
                <>
                    <div className="md:col-span-1 xl:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Elder Age & Mobility</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 text-sm"
                            placeholder="e.g., 75 years, wheelchair-bound"
                            value={fields.elderAge}
                            onChange={(e) => setFields({ ...fields, elderAge: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Medical Needs</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Medical conditions, nursing involvement"
                            value={fields.medicalNeeds}
                            onChange={(e) => setFields({ ...fields, medicalNeeds: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Overnight Care Required"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.overnightCare}
                            onChange={(v) => setFields({ ...fields, overnightCare: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Tasks</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Feeding, hygiene, companionship, hospital runs"
                            value={fields.eldercareTasks}
                            onChange={(e) => setFields({ ...fields, eldercareTasks: e.target.value })}
                        />
                    </div>
                </>
            )}

            {/* RUNNER/ERRAND BOY FIELDS */}
            {roleType === 'runner' && (
                <>
                    <div className="md:col-span-1 xl:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Typical Errands</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-20 text-sm"
                            placeholder="Grocery, courier, bank work"
                            value={fields.typicalErrands}
                            onChange={(e) => setFields({ ...fields, typicalErrands: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Travel Range"
                            placeholder="Select"
                            items={[
                                { label: 'Local', value: 'Local' },
                                { label: 'Across City', value: 'Across City' }
                            ]}
                            value={fields.travelRange}
                            onChange={(v) => setFields({ ...fields, travelRange: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Vehicle Required/Provided"
                            placeholder="Select"
                            items={[
                                { label: 'Required', value: 'Required' },
                                { label: 'Provided', value: 'Provided' },
                                { label: 'Not Needed', value: 'Not Needed' }
                            ]}
                            value={fields.vehicleRequired}
                            onChange={(v) => setFields({ ...fields, vehicleRequired: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Cash Handling Involved"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' }
                            ]}
                            value={fields.cashHandling}
                            onChange={(v) => setFields({ ...fields, cashHandling: v })}
                        />
                    </div>

                    <div className="md:col-span-1 xl:col-span-1">
                        <SimpleSelect
                            label="Reporting Preference"
                            placeholder="Select"
                            items={[
                                { label: 'Daily', value: 'Daily' },
                                { label: 'Task-Based', value: 'Task-Based' }
                            ]}
                            value={fields.reportingPreference}
                            onChange={(v) => setFields({ ...fields, reportingPreference: v })}
                        />
                    </div>
                </>
            )}

            {/* MANAGER/BUTLER/FRONT OFFICE FIELDS */}
            {roleType === 'manager' && (
                <>
                    <div className="md:col-span-1 xl:col-span-3">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Special Requirements & Duties</label>
                        <textarea
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 min-h-24 text-sm"
                            placeholder="Describe specific duties, management requirements, and expectations"
                            value={fields.specialRequirements}
                            onChange={(e) => setFields({ ...fields, specialRequirements: e.target.value })}
                        />
                    </div>
                </>
            )}
        </>
    );
}