'use client';
import { useState } from 'react';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { app } from '../../firebase/config';


const db = getFirestore(app);

export default function PopulatePricingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const pricingData = [
    // 8-12 Hours - Bengaluru
    { city: "Bengaluru", role: "Chef", hours: "8-12Hours", "1-2yrs": 25000, "3-6yrs": 30000, "7-10yrs": 35000, "10+yrs": 42000 },
    { city: "Bengaluru", role: "Cook", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 24000, "7-10yrs": 30000, "10+yrs": 50000 },
    { city: "Bengaluru", role: "Driver", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Eldercare Taker", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 31000 },
    { city: "Bengaluru", role: "Gardener", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "House Manager/Governess", hours: "8-12Hours", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Bengaluru", role: "Housekeeper", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 26000, "10+yrs": 28000 },
    { city: "Bengaluru", role: "Housekeeper + Cook", hours: "8-12Hours", "1-2yrs": 24000, "3-6yrs": 27000, "7-10yrs": 30000, "10+yrs": 32000 },
    { city: "Bengaluru", role: "Nanny / Baby Care", hours: "8-12Hours", "1-2yrs": 22000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 35000 },
    { city: "Bengaluru", role: "Nanny + Cook", hours: "8-12Hours", "1-2yrs": 25000, "3-6yrs": 28000, "7-10yrs": 31000, "10+yrs": 38000 },
    { city: "Bengaluru", role: "Petcare Taker", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Bengaluru", role: "Runner", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Bengaluru", role: "Security Guard", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 26000, "10+yrs": 30000 },

    // 8-12 Hours - Delhi NCR
    { city: "Delhi NCR", role: "Chef", hours: "8-12Hours", "1-2yrs": 25000, "3-6yrs": 30000, "7-10yrs": 35000, "10+yrs": 42000 },
    { city: "Delhi NCR", role: "Cook", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 24000, "7-10yrs": 30000, "10+yrs": 50000 },
    { city: "Delhi NCR", role: "Driver", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 23000, "7-10yrs": 26000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Eldercare Taker", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 31000 },
    { city: "Delhi NCR", role: "Gardener", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "House Manager/Governess", hours: "8-12Hours", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Delhi NCR", role: "Housekeeper", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Delhi NCR", role: "Housekeeper + Cook", hours: "8-12Hours", "1-2yrs": 22000, "3-6yrs": 26000, "7-10yrs": 28000, "10+yrs": 31000 },
    { city: "Delhi NCR", role: "Nanny / Baby Care", hours: "8-12Hours", "1-2yrs": 22000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 35000 },
    { city: "Delhi NCR", role: "Nanny + Cook", hours: "8-12Hours", "1-2yrs": 25000, "3-6yrs": 28000, "7-10yrs": 31000, "10+yrs": 38000 },
    { city: "Delhi NCR", role: "Petcare Taker", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Delhi NCR", role: "Runner", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Delhi NCR", role: "Security Guard", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 26000, "10+yrs": 30000 },

    // 8-12 Hours - Mumbai
    { city: "Mumbai", role: "Chef", hours: "8-12Hours", "1-2yrs": 26000, "3-6yrs": 32000, "7-10yrs": 36000, "10+yrs": 45000 },
    { city: "Mumbai", role: "Cook", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 26000, "7-10yrs": 35000, "10+yrs": 55000 },
    { city: "Mumbai", role: "Driver", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Mumbai", role: "Eldercare Taker", hours: "8-12Hours", "1-2yrs": 22000, "3-6yrs": 27000, "7-10yrs": 30000, "10+yrs": 33000 },
    { city: "Mumbai", role: "Gardener", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Mumbai", role: "House Manager/Governess", hours: "8-12Hours", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Mumbai", role: "Housekeeper", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 26000, "10+yrs": 28000 },
    { city: "Mumbai", role: "Housekeeper + Cook", hours: "8-12Hours", "1-2yrs": 24000, "3-6yrs": 27000, "7-10yrs": 30000, "10+yrs": 32000 },
    { city: "Mumbai", role: "Nanny / Baby Care", hours: "8-12Hours", "1-2yrs": 24000, "3-6yrs": 26000, "7-10yrs": 30000, "10+yrs": 35000 },
    { city: "Mumbai", role: "Nanny + Cook", hours: "8-12Hours", "1-2yrs": 27000, "3-6yrs": 29000, "7-10yrs": 33000, "10+yrs": 38000 },
    { city: "Mumbai", role: "Petcare Taker", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Mumbai", role: "Runner", hours: "8-12Hours", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 28000 },
    { city: "Mumbai", role: "Security Guard", hours: "8-12Hours", "1-2yrs": 20000, "3-6yrs": 24000, "7-10yrs": 26000, "10+yrs": 30000 },

    // Live-in (24 Hours) - Bengaluru
    { city: "Bengaluru", role: "Chef", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Cook", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 20000, "7-10yrs": 27000, "10+yrs": 40000 },
    { city: "Bengaluru", role: "Driver", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Eldercare Taker", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 23000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Gardener", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "House Manager/Governess", hours: "Live-in (24Hours)", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Bengaluru", role: "Housekeeper", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 17000, "7-10yrs": 20000, "10+yrs": 25000 },
    { city: "Bengaluru", role: "Housekeeper + Cook", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 21000, "7-10yrs": 23000, "10+yrs": 28000 },
    { city: "Bengaluru", role: "Nanny / Baby Care", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Nanny + Cook", hours: "Live-in (24Hours)", "1-2yrs": 22000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Bengaluru", role: "Petcare Taker", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 28000 },
    { city: "Bengaluru", role: "Runner", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 17000, "7-10yrs": 20000, "10+yrs": 25000 },
    { city: "Bengaluru", role: "Security Guard", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 26000, "10+yrs": 30000 },

    // Live-in (24 Hours) - Delhi NCR
    { city: "Delhi NCR", role: "Chef", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Cook", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 20000, "7-10yrs": 27000, "10+yrs": 40000 },
    { city: "Delhi NCR", role: "Driver", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 23000, "7-10yrs": 26000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Eldercare Taker", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 23000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Gardener", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "House Manager/Governess", hours: "Live-in (24Hours)", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Delhi NCR", role: "Housekeeper", hours: "Live-in (24Hours)", "1-2yrs": 15000, "3-6yrs": 17000, "7-10yrs": 20000, "10+yrs": 25000 },
    { city: "Delhi NCR", role: "Housekeeper + Cook", hours: "Live-in (24Hours)", "1-2yrs": 19000, "3-6yrs": 21000, "7-10yrs": 23000, "10+yrs": 28000 },
    { city: "Delhi NCR", role: "Nanny / Baby Care", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Nanny + Cook", hours: "Live-in (24Hours)", "1-2yrs": 22000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Delhi NCR", role: "Petcare Taker", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 28000 },
    { city: "Delhi NCR", role: "Runner", hours: "Live-in (24Hours)", "1-2yrs": 15000, "3-6yrs": 17000, "7-10yrs": 20000, "10+yrs": 25000 },
    { city: "Delhi NCR", role: "Security Guard", hours: "Live-in (24Hours)", "1-2yrs": 18000, "3-6yrs": 22000, "7-10yrs": 26000, "10+yrs": 30000 },

    // Live-in (24 Hours) - Mumbai
    { city: "Mumbai", role: "Chef", hours: "Live-in (24Hours)", "1-2yrs": 22000, "3-6yrs": 25000, "7-10yrs": 30000, "10+yrs": 32000 },
    { city: "Mumbai", role: "Cook", hours: "Live-in (24Hours)", "1-2yrs": 17000, "3-6yrs": 21000, "7-10yrs": 28000, "10+yrs": 45000 },
    { city: "Mumbai", role: "Driver", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 28000, "10+yrs": 30000 },
    { city: "Mumbai", role: "Eldercare Taker", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 25000, "7-10yrs": 27000, "10+yrs": 30000 },
    { city: "Mumbai", role: "Gardener", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 25000, "10+yrs": 30000 },
    { city: "Mumbai", role: "House Manager/Governess", hours: "Live-in (24Hours)", "1-2yrs": 32000, "3-6yrs": 36000, "7-10yrs": 45000, "10+yrs": 60000 },
    { city: "Mumbai", role: "Housekeeper", hours: "Live-in (24Hours)", "1-2yrs": 17000, "3-6yrs": 18000, "7-10yrs": 21000, "10+yrs": 26000 },
    { city: "Mumbai", role: "Housekeeper + Cook", hours: "Live-in (24Hours)", "1-2yrs": 21000, "3-6yrs": 22000, "7-10yrs": 24000, "10+yrs": 29000 },
    { city: "Mumbai", role: "Nanny / Baby Care", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 23000, "7-10yrs": 26000, "10+yrs": 30000 },
    { city: "Mumbai", role: "Nanny + Cook", hours: "Live-in (24Hours)", "1-2yrs": 23000, "3-6yrs": 26000, "7-10yrs": 28000, "10+yrs": 32000 },
    { city: "Mumbai", role: "Petcare Taker", hours: "Live-in (24Hours)", "1-2yrs": 16000, "3-6yrs": 20000, "7-10yrs": 24000, "10+yrs": 28000 },
    { city: "Mumbai", role: "Runner", hours: "Live-in (24Hours)", "1-2yrs": 17000, "3-6yrs": 18000, "7-10yrs": 21000, "10+yrs": 26000 },
    { city: "Mumbai", role: "Security Guard", hours: "Live-in (24Hours)", "1-2yrs": 20000, "3-6yrs": 24000, "7-10yrs": 26000, "10+yrs": 30000 },
  ];

  const handlePopulate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const collectionRef = collection(db, "pricingSheetCityWise");

      // Check existing data
      const existingDocs = await getDocs(collectionRef);
      if (!existingDocs.empty) {
        setResult({
          success: false,
          message: `Collection already has ${existingDocs.size} documents. Skipping.`
        });
        setLoading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of pricingData) {
        try {
          await addDoc(collectionRef, item);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error adding ${item.city} - ${item.role}:`, error);
        }
      }

      setResult({
        success: true,
        message: `Successfully added ${successCount} documents. Errors: ${errorCount}`
      });

    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Populate Pricing Data
        </h1>

        <button
          onClick={handlePopulate}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition ${loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {loading ? 'Populating...' : 'Populate Database'}
        </button>

        {result && (
          <div
            className={`mt-6 p-4 rounded-lg ${result.success
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
              }`}
          >
            <p className="font-semibold">
              {result.success ? '✅ Success!' : '❌ Error'}
            </p>
            <p className="text-sm mt-2">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}