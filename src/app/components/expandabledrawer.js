import React, { useMemo, useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { getFirestore, doc, updateDoc, Timestamp } from 'firebase/firestore';
import RoleQuestions from './rolequestion';
import { triggerSnackbar } from './snakbar';

// Enhanced Status Badge with proper colors
const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    const statusLower = status?.toLowerCase() || '';

    if (statusLower.includes('deployed') || statusLower.includes('service completed')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (statusLower.includes('trial scheduled') || statusLower.includes('interview scheduled') || statusLower.includes('active')) {
      return 'bg-blue-100 text-blue-600 border-blue-200';
    }
    if (statusLower.includes('patron approved') || statusLower.includes('approved')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (statusLower.includes('profile') || statusLower.includes('training')) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    if (statusLower.includes('office trial scheduled')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    if (statusLower.includes('reject') || statusLower.includes('replaced')) {
      return 'bg-red-100 text-red-600 border-red-200';
    }
    if (statusLower.includes('interview') || statusLower.includes('pending')) {
      return 'bg-orange-100 text-orange-600 border-orange-200';
    }
    if (statusLower.includes('allocated') || statusLower.includes('trial completed')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }

    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusStyle()}`}>
      {status}
    </span>
  );
};

// ✅ UPDATED: Compact Candidate Detail Card with Bold Field Support
const CandidateDetailCard = ({
  candidate,
  patronData,
  index,
  displayFields = [],
  actionButtons = [],
  boldFields = [], // ✅ NEW: Array of field keys to make bold
  primaryRole: primaryRoleProp
}) => {
  const [showQuestions, setShowQuestions] = useState(false);

  const derivedRole = useMemo(() => {
    return (
      candidate?.primaryRole ||
      candidate?.candidatePrimaryRole ||
      candidate?.profession ||
      candidate?.role ||
      primaryRoleProp ||
      patronData?.primaryRole ||
      patronData?.profession ||
      ''
    );
  }, [candidate, patronData, primaryRoleProp]);

  return (
    <div className="bg-white border border-gray-300 rounded-lg mb-3 shadow-sm">
      {/* Header - More Compact */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
          Candidate : {candidate?.candidateName}
        </h3>
        <button
          onClick={() => setShowQuestions(true)}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-medium rounded transition whitespace-nowrap"
          style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
        >
          Interview Question Bank
        </button>
      </div>

      {/* Content - Tighter Spacing */}
      <div className="px-4 py-3 space-y-3">
        {/* Display fields in compact grid */}
        {displayFields.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
            {displayFields.map((field, idx) => {
              const value = candidate[field.key];
              const displayValue = field.render
                ? field.render(value, candidate)
                : (value || 'N/A');

              // ✅ Check if this field should be bold
              const isBold = boldFields.includes(field.key);

              return (
                <div key={idx}>
                  <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                    {field.label}
                  </div>
                  <div
                    className={`text-xs text-gray-800 ${isBold ? 'font-bold' : 'font-medium'}`}
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Render action buttons - More Compact */}
        {actionButtons.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2">
              {actionButtons.map((btn, idx) => {
                if (!btn.render) return null;

                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="text-[10px] font-semibold text-gray-600 truncate" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                      {btn.label || btn.key}
                    </div>
                    <div className="[&>button]:text-[10px] [&>button]:px-2 [&>button]:py-0.5 [&>button]:h-auto [&>span]:text-[10px]">
                      {btn.render(candidate[btn.key], candidate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <RoleQuestions
        open={showQuestions}
        onClose={() => setShowQuestions(false)}
        role={derivedRole}
      />
    </div>
  );
};

// ✅ UPDATED: Training Candidate Cards with Bold Field Support
const TrainingCandidateCards = ({
  candidates,
  patronId,
  displayFields = [],
  boldFields = [], // ✅ NEW: Bold field support
  onEditProfile,
  onViewProfile
}) => {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
        No candidates found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {candidates.map((candidate, index) => {
        const hasProfile =
          candidate.candidateStatus === "Help Profile Created" ||
          candidate.candidateStatus === "Patron Approved" ||
          candidate.candidateStatus === "Deployed";

        return (
          <div
            key={candidate.id || index}
            className="bg-white border border-gray-300 rounded-lg shadow-sm"
          >
            {/* Header - More Compact */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                Candidate : {candidate?.candidateName}
              </h3>

              {/* Action Buttons - Smaller Size */}
              {hasProfile && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onViewProfile(candidate)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-all hover:opacity-80 bg-green-600 text-white"
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                  >
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => onEditProfile(candidate, patronId)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-all hover:opacity-80"
                    style={{
                      color: '#EF5F24',
                      border: '1px solid #EF5F24',
                      fontFamily: 'NeuzeitGro, sans-serif'
                    }}
                  >
                    <Edit2 style={{ width: '10px', height: '10px' }} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content - Tighter Grid */}
            <div className="px-4 py-3">
              {displayFields.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                  {displayFields.map((field, idx) => {
                    const value = candidate[field.key];
                    const displayValue = field.render
                      ? field.render(value, candidate)
                      : (value || 'N/A');

                    // ✅ Check if field should be bold
                    const isBold = boldFields.includes(field.key);

                    return (
                      <div key={idx}>
                        <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                          {field.label}
                        </div>
                        <div
                          className={`text-xs text-gray-800 break-words ${isBold ? 'font-bold' : 'font-medium'}`}
                          style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                        >
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                  {Object.entries(candidate).map(([key, value]) => {
                    if (key === 'id' || key === 'firestoreId') return null;

                    return (
                      <div key={key}>
                        <div className="text-[10px] text-gray-500 mb-0.5 capitalize" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-xs font-medium text-gray-800 break-words" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                          {value?.toString() || 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ✅ UPDATED: Normal Candidate Cards with Bold Field Support
const NormalCandidateCards = ({
  candidate,
  patronData,
  index,
  displayFields = [],
  actionButtons = [],
  boldFields = [] // ✅ NEW: Bold field support
}) => {
  return (
    <div className="bg-white border border-gray-300 rounded-lg mb-3 shadow-sm">
      {/* Header - More Compact */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
          Candidate : {candidate?.name} {candidate?.patronName}
        </h3>
      </div>

      {/* Content - Tighter Spacing */}
      <div className="px-4 py-3 space-y-3">
        {/* Display fields in compact grid */}
        {displayFields.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
            {displayFields.map((field, idx) => {
              const value = candidate[field.key];
              const displayValue = field.render
                ? field.render(value, candidate)
                : (value || 'N/A');

              // ✅ Check if field should be bold
              const isBold = boldFields.includes(field.key);

              return (
                <div key={idx}>
                  <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                    {field.label}
                  </div>
                  <div
                    className={`text-xs text-gray-800 ${isBold ? 'font-bold' : 'font-medium'}`}
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Render action buttons - More Compact */}
        {actionButtons.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2">
              {actionButtons.map((btn, idx) => {
                if (!btn.render) return null;

                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="text-[10px] font-semibold text-gray-600 truncate" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                      {btn.label || btn.key}
                    </div>
                    <div className="[&>button]:text-[10px] [&>button]:px-2 [&>button]:py-0.5 [&>button]:h-auto [&>span]:text-[10px]">
                      {btn.render(candidate[btn.key], candidate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Recurring Task Card Component for OTS Dashboard
const RecurringTaskCard = ({
  tasks,
  onLMServiceCard,
  onBenchServiceCard,
  onAllocate,
  onCloseTicket,
  onCashMemo,
  candidateDetailsCache,
  onTaskUpdate
}) => {

  const [editingTask, setEditingTask] = useState(null);
  const [editData, setEditData] = useState({});
  const db = getFirestore();

  const handleSaveDateTime = async (task) => {
    try {
      const taskRef = doc(db, "patronOtsAddRequest", task.id);

      const updates = {
        taskStartTime: Timestamp.fromDate(new Date(editData.startDate + 'T' + editData.startTime)),
        taskEndTime: Timestamp.fromDate(new Date(editData.endDate + 'T' + editData.endTime)),
      };

      await updateDoc(taskRef, updates);

      // ✅ Update ONLY this task in the tasks array (no full reload)
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updates); // Pass task ID and updates
      }

      setEditingTask(null);
      triggerSnackbar("Task time updated successfully!", "success");
    } catch (error) {
      console.error("Error updating task time:", error);
      triggerSnackbar("Failed to update task time", "error");
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
        No recurring tasks found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4">
      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
        Task Occurrences ({tasks.length})
      </h3>
      <div className="space-y-3 sm:space-y-4">
        {tasks
          .sort((a, b) => {
            const dateA = a.taskDate?.toDate ? a.taskDate.toDate() : new Date(a.taskDate);
            const dateB = b.taskDate?.toDate ? b.taskDate.toDate() : new Date(b.taskDate);
            return dateA - dateB;
          })
          .map((task, index) => {

            const taskDate = task.taskDate?.toDate ? task.taskDate.toDate() : new Date(task.taskDate);
            const formattedDate = taskDate.toLocaleDateString("en-GB");

            // ✅ FIXED: Handle arrays for taskStartTime and taskEndTime
            let taskStartTimeValue = task.taskStartTime;
            let taskEndTimeValue = task.taskEndTime;

            // If arrays, take the first element
            if (Array.isArray(taskStartTimeValue)) {
              taskStartTimeValue = taskStartTimeValue[0];
            }
            if (Array.isArray(taskEndTimeValue)) {
              taskEndTimeValue = taskEndTimeValue[0];
            }

            const taskStartDate = taskStartTimeValue?.toDate ? taskStartTimeValue.toDate() : (taskStartTimeValue ? new Date(taskStartTimeValue) : null);
            const taskEndDate = taskEndTimeValue?.toDate ? taskEndTimeValue.toDate() : (taskEndTimeValue ? new Date(taskEndTimeValue) : null);

            let displayDate = formattedDate;
            if (taskStartDate && taskEndDate) {
              const startDay = taskStartDate.toLocaleDateString("en-GB");
              const endDay = taskEndDate.toLocaleDateString("en-GB");
              if (startDay !== endDay) {
                displayDate = `${startDay} to ${endDay}`;
              }
            }

            const formattedTime = task.taskStartTime ?
              (task.taskStartTime.toDate ?
                task.taskStartTime.toDate().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })
                : task.taskStartTime
              ) : "N/A";
            const formattedEndTime = task.taskEndTime ?
              (task.taskEndTime.toDate ?
                task.taskEndTime.toDate().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })
                : task.taskEndTime
              ) : "N/A";

            return (
              <div key={task.id} className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                      <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        Occurrence {task.occurrenceNumber || index + 1}
                      </span>
                      {editingTask === task.id ? (
                        // Edit Mode
                        <>
                          <input
                            type="date"
                            value={editData.startDate}
                            onChange={(e) => setEditData(prev => ({ ...prev, startDate: e.target.value }))}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="time"
                            value={editData.startTime}
                            onChange={(e) => setEditData(prev => ({ ...prev, startTime: e.target.value }))}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <span className="text-gray-600">to</span>
                          <input
                            type="date"
                            value={editData.endDate}
                            onChange={(e) => setEditData(prev => ({ ...prev, endDate: e.target.value }))}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="time"
                            value={editData.endTime}
                            onChange={(e) => setEditData(prev => ({ ...prev, endTime: e.target.value }))}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleSaveDateTime(task)}
                            className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        // View Mode
                        <>
                          <span className="text-gray-700 font-semibold text-xs sm:text-sm">
                            📅 {displayDate}
                          </span>
                          <span className="text-gray-600 text-xs sm:text-sm">
                            🕐 {formattedTime} - {formattedEndTime}
                          </span>
                          <button
                            onClick={() => {
                              const taskStartDate = task.taskStartTime?.toDate ? task.taskStartTime.toDate() : new Date(task.taskStartTime);
                              const taskEndDate = task.taskEndTime?.toDate ? task.taskEndTime.toDate() : new Date(task.taskEndTime);

                              setEditData({
                                startDate: taskStartDate.toISOString().split('T')[0],
                                startTime: taskStartDate.toTimeString().slice(0, 5),
                                endDate: taskEndDate.toISOString().split('T')[0],
                                endTime: taskEndDate.toTimeString().slice(0, 5),
                              });
                              setEditingTask(task.id);
                            }}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons for each occurrence */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onLMServiceCard(task)}
                      className="bg-[#EF5F24] text-white px-2.5 py-1.5 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-[#d54d1a] whitespace-nowrap transition-colors"
                      style={{ fontFamily: 'NeuzeitGro, sans-serif', fontSize: "11px" }}
                    >
                      LM Service Card
                    </button>
                    <button
                      onClick={() => onBenchServiceCard(task)}
                      className="bg-[#da1507ff] text-white  px-2.5 py-1.5 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-[#f92313ff] whitespace-nowrap transition-colors"
                      style={{ fontFamily: 'NeuzeitGro, sans-serif', fontSize: "11px" }}
                    >
                      Bench Service Card
                    </button>
                    <button
                      onClick={() => onAllocate(task)}
                      className="bg-blue-600 text-white px-2.5 py-1.5 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 whitespace-nowrap transition-colors"
                      style={{ fontFamily: 'NeuzeitGro, sans-serif', fontSize: "11px" }}
                    >
                      Allocate
                    </button>
                    <button
                      onClick={() => onCloseTicket(task)}
                      className="bg-green-600 text-white px-2.5 py-1.5 sm:px-3 sm:py-1 rounded text-xs hover:bg-green-700 whitespace-nowrap transition-colors"
                      style={{ fontFamily: 'NeuzeitGro, sans-serif', fontSize: "11px" }}
                    >
                      Close Ticket
                    </button>
                    <button
                      onClick={() => onCashMemo(task)}
                      className="bg-[#EF5F24] text-white px-2.5 py-1.5 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-[#d54d1a] whitespace-nowrap transition-colors"
                      style={{ fontFamily: 'NeuzeitGro, sans-serif', fontSize: "11px" }}
                    >
                      Cash Memo
                    </button>
                  </div>
                </div>

                {/* Show candidate details for this specific occurrence */}
                {candidateDetailsCache[task.id] && candidateDetailsCache[task.id].length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-xs font-semibold text-gray-700 mb-2" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                      Allocated Candidates
                    </p>
                    <div className="space-y-2">
                      {candidateDetailsCache[task.id].map(candidate => {
                        const taskStartTimes = candidate.taskStartTime || [];
                        const taskEndTimes = candidate.taskEndTime || [];
                        const resourceInTimes = candidate.resourceInTimeWithId || [];
                        const resourceOutTimes = candidate.resourceOutTimeWithId || [];

                        return (
                          <div key={candidate.id} className="bg-white p-2 rounded border border-gray-200">
                            {/* Compact Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <span className="font-semibold text-gray-900 text-xs" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                  {candidate.candidateName}
                                </span>
                                <span className="text-gray-600 ml-2 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                  ({candidate.candidateId})
                                </span>
                              </div>
                            </div>

                            {/* Compact 2-Column Grid for Times */}
                            <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                              {/* Task Times */}
                              {taskStartTimes.length > 0 && (
                                <div className="bg-blue-50 p-1.5 rounded">
                                  <span className="text-blue-700 font-semibold block mb-0.5">Task Start Time</span>
                                  {taskStartTimes.map((time, idx) => {
                                    const date = time?.toDate ? time.toDate() : new Date(time);
                                    return (
                                      <div key={idx} className="text-blue-900">
                                        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {taskEndTimes.length > 0 && (
                                <div className="bg-blue-50 p-1.5 rounded">
                                  <span className="text-blue-700 font-semibold block mb-0.5">Task End Time</span>
                                  {taskEndTimes.map((time, idx) => {
                                    const date = time?.toDate ? time.toDate() : new Date(time);
                                    return (
                                      <div key={idx} className="text-blue-900">
                                        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Resource Times */}
                              {resourceInTimes.length > 0 && (
                                <div className="bg-green-50 p-1.5 rounded">
                                  <span className="text-green-700 font-semibold block mb-0.5">Supply-In Time</span>
                                  {resourceInTimes.map((time, idx) => {
                                    const date = time?.toDate ? time.toDate() : new Date(time);
                                    return (
                                      <div key={idx} className="text-green-900">
                                        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {resourceOutTimes.length > 0 && (
                                <div className="bg-orange-50 p-1.5 rounded">
                                  <span className="text-orange-700 font-semibold block mb-0.5">Supply-Out Time</span>
                                  {resourceOutTimes.map((time, idx) => {
                                    const date = time?.toDate ? time.toDate() : new Date(time);
                                    return (
                                      <div key={idx} className="text-orange-900">
                                        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};


export default function ExpandableDrawer() {
  return null;
}

export { StatusBadge, CandidateDetailCard, TrainingCandidateCards, NormalCandidateCards, RecurringTaskCard };