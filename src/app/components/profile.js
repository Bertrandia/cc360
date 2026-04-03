'use client';

export default function ProfileCard({
  viewingCandidate,
  selectedPatronData,
  profileScale = 0.8
}) {
  console.log("--- Debugging ProfileCard ---");
  console.log("Full selectedPatronData:", selectedPatronData);
  console.log("Salary Range:", selectedPatronData?.salaryRange);
  console.log("Primary Role:", selectedPatronData?.primaryRole);
  console.log("Viewing Candidate:", viewingCandidate);
  const capitalizeWords = (str) => {
    if (!str) return "";
    return str.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const candidateName = capitalizeWords(
    viewingCandidate.candidateName?.split('-')[0] ||
    viewingCandidate.candidateName?.split(' ')[0] ||
    "Candidate"
  );

  const role = capitalizeWords(selectedPatronData?.primaryRole || "Role");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${candidateName} - Profile</title>

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');

    body {
      background: #faf9f8;
      display: flex;
      justify-content: center;
      padding: 30px;
    }

    .serif {
      font-family: 'Playfair Display', serif;
    }

    .sans {
      font-family: 'Inter', sans-serif;
    }

    .profile-container {
      transform: scale(${profileScale});
      transform-origin: top center;
      transition: 0.3s ease;
      padding: 30px;
    }

    @media print {
      .controls { display: none; }
      body { background: white; }
      .profile-container { transform: scale(1); }
    }
  </style>
</head>

<body>

  <!-- Download Button -->
  <div class="controls fixed top-4 right-4 bg-white rounded-lg shadow-md p-3 z-50">
    <button onclick="downloadProfile()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold sans">
      Download
    </button>
  </div>

  <!-- PROFILE CARD -->
  <div class="profile-container" id="profileCard">
  <!-- Logo + CareCrew Text -->
<div class="mb-6 flex items-center gap-3">
  <img src="/logo.png" 
       alt="CareCrew Logo" 
       class="h-10 w-10 object-contain" 
       onerror="this.style.display='none'" />

  <span class="serif-font text-3xl font-bold tracking-wide">
    <span class="text-[#A3472A]">CareCrew</span>
  </span>
</div>


    <div class="bg-white rounded-[40px] shadow-lg overflow-hidden" style="width: 750px;">

      <!-- HEADER -->
      <div class="bg-[#A3472A] text-white px-12 pt-12 pb-20 rounded-b-[40px] relative">

        <div class="flex justify-between w-full">

          <!-- Left -->
          <div>
            <img src="/pinch.png" class="h-10 mb-10" onerror="this.style.display='none'"/>
            <div class="mb-12">   <!-- 👈 Add space below headings -->
            <h1 class="serif text-[48px] font-semibold leading-[1.1]">Meet Your</h1>
            <h1 class="serif text-[48px] font-semibold leading-[1.1] mt-1">Home Magician</h1>
            </div>

            <!-- Info Box -->
            
<!-- WRAPPER -->
<div class="relative flex items-start">

  <!-- LEFT BORDER BOX -->
  <div class="mt-10 bg-transparent border border-white rounded-3xl px-8 pr-32 py-6 leading-loose sans text-[17px] inline-block">
    <p><span class="font-semibold">Age - </span>${viewingCandidate.age}</p>
    <p><span class="font-semibold">Monthly Salary - </span>Rs.${selectedPatronData?.salaryRange}</p>
    <p><span class="font-semibold">Work Experience - </span>${viewingCandidate.totalExperience}</p>
    <p><span class="font-semibold">Working Hours - </span>${viewingCandidate.workTime}</p>
    <p><span class="font-semibold">Language - </span>${Array.isArray(viewingCandidate.primaryLanguage)
      ? viewingCandidate.primaryLanguage.join(', ')
      : (viewingCandidate.primaryLanguage || 'Not specified')
    }</p>
  </div>

  <!-- RIGHT IMAGE (OVERLAPPING BORDER) -->
<div id="candidateImageWrapper"
     class="absolute top-0 right-0 translate-x-2/3 -translate-y-8
            w-[300px] h-[370px] rounded-xl overflow-hidden bg-[#A3472A] flex items-center justify-center">

    ${viewingCandidate.image
      ? `<img 
  id="candidateImage"
  src="${viewingCandidate.image}"
  class="w-full h-full object-cover"
  crossOrigin="anonymous"
/>

`
      : `<div class="w-full h-full flex items-center justify-center text-gray-300 text-6xl">👤</div>`
    }

  </div>

</div>
</div>

        </div>
      </div>

      <!-- NAME -->
      <div class="text-center mt-2 mb-4">
        <h2 class="serif text-[34px] font-semibold text-[#A3472A]">
          ${candidateName} - ${role}
        </h2>
      </div>

      <!-- BODY SECTIONS -->
      <div class="px-4 pb-12 sans text-[18px] text-[#4B4B4B] leading-relaxed">

        <div class="grid grid-cols-2 gap-10">

          <!-- ABOUT -->
          <div>
            <h3 class="font-semibold text-[18px] text-black mb-3">About</h3>
            <p>
              ${viewingCandidate.helpAboutSection}
            </p>
          </div>

          <!-- SKILLS -->
          <div>
            <h3 class="font-semibold text-[16px] text-black mb-3">
              ${candidateName} possesses a wide range of skills in, including:
            </h3>

            <ul class="list-disc ml-5 space-y-1">
              ${viewingCandidate.helpSkill?.map(
      s => `<li>${s}</li>`
    ).join('')
    }
            </ul>
          </div>

        </div>

        <!-- QUOTE -->
        <div class="relative text-center mt-10 px-8">
          <div class="absolute left-0 top-0 text-[#A3472A] text-[70px] opacity-30 serif">“</div>
          <div class="absolute right-0 bottom-0 text-[#A3472A] text-[70px] opacity-30 serif">”</div>

          <p class="serif text-[20px] font-semibold text-[#B12D15] relative z-10 
           max-w-[600px] mx-auto leading-relaxed break-words">
  ${viewingCandidate.quotes}
</p>

        </div>

      </div>
    </div>
  </div>
<script>
async function imageToBase64(url) {
  const response = await fetch(url, { mode: 'cors' });
  const blob = await response.blob();

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
</script>

<script>
async function downloadProfile() {
  const original = document.getElementById('profileCard');
  const controls = document.querySelector('.controls');
  controls.style.display = 'none';

  // 1️⃣ Clone the profile
  const clone = original.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.position = 'fixed';
  clone.style.left = '-10000px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  // 2️⃣ Handle the Image Conversion to Base64
  const wrapper = clone.querySelector('#candidateImageWrapper');
  const img = wrapper?.querySelector('img');

  if (wrapper && img && img.src) {
    try {
      // Fetch the image and convert it to a data URL
      const response = await fetch(img.src, { mode: 'cors' });
      const blob = await response.blob();
      const base64data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Apply as background to the wrapper for cleaner rendering
      wrapper.style.backgroundImage = 'url("' + base64data + '")';
wrapper.style.backgroundSize = 'cover';
wrapper.style.backgroundPosition = 'center';
      img.remove(); 
    } catch (err) {
      console.error("CORS error: Could not load candidate image", err);
    }
  }

  // 3️⃣ Capture using html2canvas with useCORS enabled
  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true, // This is mandatory
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false // Set to true if you need to debug logs
  });

  const link = document.createElement('a');
  link.download = '${candidateName}_Profile.png';
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();

  // 4️⃣ Cleanup
  document.body.removeChild(clone);
  controls.style.display = 'block';
}
</script>
</body>
</html>`;
}