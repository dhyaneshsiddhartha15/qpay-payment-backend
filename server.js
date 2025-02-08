const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const dotenv = require("dotenv");
const paymentController = require("./controllers/paymentController"); // ✅ Import payment controller

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Enable CORS for both Localhost and Production
app.use(
  cors({
    origin: "*", // ✅ Allow QPay redirect requests
    credentials: true,
    methods: ["GET", "POST"],
  })
);

const PORT = process.env.PORT || 8080;
const QPAY_URL = "https://pguat.qcb.gov.qa/qcb-pg/api/gateway/2.0";
const SECRET_KEY = process.env.QPAY_SECRET_KEY;
const MERCHANT_ID = process.env.QPAY_MERCHANT_ID;
const BANK_ID = "QPAYPG03"; // ✅ Default Bank ID

// ✅ Generate Secure Hash Function
const generateSecureHash = (data) => {
  let hashString = SECRET_KEY;
  Object.keys(data)
    .sort()
    .forEach((key) => {
      hashString += data[key];
    });
  return crypto.createHash("sha256").update(hashString).digest("hex");
};

// ✅ Middleware to Append `bankId`, `merchantId`, and `pun` Before Sending to Controller
const appendPaymentData = (req, res, next) => {
  try {
    console.log("🔄 Appending bankId, merchantId, and pun to request");

    const { amount, description } = req.body;

    if (!amount || !description) {
      return res
        .status(400)
        .json({ error: "Amount and Description are required" });
    }

    // ✅ Generate Unique Payment ID (PUN)
    const PUN = crypto.randomBytes(16).toString("hex");
    const TransactionRequestDate = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    // ✅ Append Additional Fields
    req.body.bankId = BANK_ID;
    req.body.merchantId = MERCHANT_ID;
    req.body.pun = PUN;
    req.body.transactionRequestDate = TransactionRequestDate;

    console.log("✅ Updated Request Data:", req.body);
    next(); // Move to the next middleware (payment controller)
  } catch (error) {
    console.error("❌ Error in Middleware:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Payment Request API (Calls Payment Controller After Middleware)
app.post(
  "/payment/request",
  appendPaymentData,
  paymentController.initiatePayment
);

// ✅ Payment Response API (Verification)
app.post("/payment/response", paymentController.handlePaymentResponse);

// ✅ Server Health Check Route
app.get("/", (req, res) => {
  res.send(
    `<h1 style="text-align:center;color:green">Website is Running #</h1>`
  );
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
