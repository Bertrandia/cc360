// components/AttendanceCard.jsx
export default function AttendanceCard({ parent, attendance, onUpload }) {
  return (
    <div className="p-4 rounded-xl bg-white shadow-md space-y-3 my-4">
      <h2 className="text-lg font-semibold">{parent.name}</h2>

      <p><strong>Role:</strong> {parent.primaryRole}</p>
      <p><strong>Address:</strong> {parent.patronAddress}</p>

      <div className="border-t my-2"></div>

      <p className="font-semibold">In-Time Entries:</p>
      {attendance.inTimes.length === 0 ? (
        <p className="text-gray-500 text-sm">No in-time yet</p>
      ) : (
        attendance.inTimes.map((t) => (
          <div key={t.id} className="text-sm p-1">
            ⏱ {t.time?.toDate().toLocaleString()}
          </div>
        ))
      )}

      <p className="font-semibold mt-3">Out-Time Entries:</p>
      {attendance.outTimes.length === 0 ? (
        <p className="text-gray-500 text-sm">No out-time yet</p>
      ) : (
        attendance.outTimes.map((t) => (
          <div key={t.id} className="text-sm p-1">
            ⏱ {t.time?.toDate().toLocaleString()}
          </div>
        ))
      )}

      <div className="border-t my-2"></div>

      <button
        onClick={() => onUpload("inTime")}
        className="bg-blue-600 w-full text-white py-2 rounded-lg"
      >
        Upload In-Time
      </button>

      <button
        onClick={() => onUpload("outTime")}
        className="bg-green-600 w-full text-white py-2 rounded-lg"
      >
        Upload Out-Time
      </button>

      <button
        onClick={() => onUpload("beforeImage")}
        className="bg-orange-600 w-full text-white py-2 rounded-lg"
      >
        Before-Service Image
      </button>

      <button
        onClick={() => onUpload("afterImage")}
        className="bg-purple-700 w-full text-white py-2 rounded-lg"
      >
        After-Service Image
      </button>
    </div>
  );
}
