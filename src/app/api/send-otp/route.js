import { NextResponse } from "next/server";
import Twilio from "twilio";

const accountSid = "AC484f82672e4db16c551881ed9c044509";
const authToken = "e2b0d8bafd31e6c69e85e225fcba843d";
const twilioNumber = "+18559653941";

const client = Twilio(accountSid, authToken);

export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ success: false, message: "Phone is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send SMS
    await client.messages.create({
      from: twilioNumber,
      to: phone,
      body: `Your OTP is: ${otp}`,
    });

    // Return OTP (for dev only, do NOT return in production)
    return NextResponse.json({ success: true, otp });
  } catch (err) {
    console.error("Twilio Error:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
}
