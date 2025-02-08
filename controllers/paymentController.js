// const crypto = require("crypto");
//
// const generateSecureHash = (data, secretKey) => {
//   const hashBuilder = [
//     secretKey,
//     data.Action || "0",
//     data.amount,
//     data.bankId,
//     "634", // CurrencyCode
//     data.extraField,
//     data.language,
//     data.merchantId,
//     data.pun,
//     data.nationalId,
//     data.pun, // MerchantModuleSessionID same as PUN
//     data.description,
//     "1", // Quantity
//     data.transactionRequestDate,
//   ].join("");
//
//   return crypto.createHash("sha256").update(hashBuilder).digest("hex");
// };
//
// exports.initiatePayment = async (req, res) => {
//   console.log("Controller dcaled");
//   try {
//     const {
//       amount,
//       bankId,
//       extraField,
//       language,
//       merchantId,
//       pun,
//       nationalId,
//       description,
//       transactionRequestDate,
//     } = req.body;
//
//     // Validate required fields
//     const requiredFields = [
//       "amount",
//       "bankId",
//       "merchantId",
//       "nationalId",
//       "description",
//     ];
//     const missingFields = requiredFields.filter((field) => !req.body[field]);
//     console.log("Missing required fields", missingFields);
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         status: "error",
//         message: `Missing required fields: ${missingFields.join(", ")}`,
//       });
//     }
//
//     const paymentData = {
//       Action: "0",
//       amount,
//       bankId,
//       CurrencyCode: "634",
//       extraField: extraField || "",
//       language: language || "EN",
//       merchantId,
//       pun,
//       nationalId,
//       description,
//       Quantity: "1",
//       transactionRequestDate,
//     };
//     console.log(paymentData);
//     const secureHash = generateSecureHash(
//       paymentData,
//       process.env.QPAY_SECRET_KEY
//     );
//     console.log("Secure Hash: " + secureHash);
//     const responseData = {
//       ...paymentData,
//       SecureHash: secureHash,
//       PG_REDIRECT_URL: process.env.QPAY_REDIRECT_URL,
//     };
//
//     res.json({
//       status: "success",
//       data: responseData,
//     });
//   } catch (error) {
//     console.log("Errro from,", error);
//     console.error("Payment initiation error:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Payment initiation failed",
//     });
//   }
// };
//
// exports.handlePaymentResponse = async (req, res) => {
//   try {
//     const responseParams = req.body;
//     const receivedSecureHash = responseParams["Response.SecureHash"];
//
//     // Remove SecureHash before validation
//     delete responseParams["Response.SecureHash"];
//
//     // Sort parameters alphabetically
//     const sortedParams = Object.keys(responseParams)
//       .sort()
//       .reduce((acc, key) => {
//         acc[key] = responseParams[key];
//         return acc;
//       }, {});
//
//     // Generate validation hash
//     const hashString =
//       process.env.QPAY_SECRET_KEY + Object.values(sortedParams).join("");
//     const generatedSecureHash = crypto
//       .createHash("sha256")
//       .update(hashString)
//       .digest("hex");
//
//     // Validate secure hash
//     if (receivedSecureHash !== generatedSecureHash) {
//       return res.status(400).json({
//         status: "error",
//         message: "Invalid secure hash",
//       });
//     }
//
//     // Process payment status
//     const paymentStatus = responseParams["Response.Status"];
//
//     // Store transaction in database
//     // Add your database logic here
//
//     res.json({
//       status: "success",
//       data: {
//         paymentStatus,
//         transactionDetails: responseParams,
//       },
//     });
//   } catch (error) {
//     console.error("Payment response handling error:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Failed to process payment response",
//     });
//   }
// };
const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");

// Correct Redirect URL for response
const REDIRECT_URL = "https://doha-payment.vercel.app/payment-response";

// Secure hash generation using the fixed field order per documentation
const generateSecureHash = (data, secretKey) => {
  console.log("🔍 Raw Data Before Hashing:", data);
  const fieldsOrder = [
    "Action",
    "BankID",
    "MerchantID",
    "CurrencyCode",
    "Amount",
    "PUN",
    "PaymentDescription",
    "MerchantModuleSessionID",
    "TransactionRequestDate",
    "Quantity",
    "ExtraFields_f14",
    "Lang",
    "NationalID",
  ];
  let hashString = secretKey;
  fieldsOrder.forEach((field) => {
    // Append field value (trimmed) or empty string if missing
    hashString +=
      data[field] !== undefined && data[field] !== null
        ? data[field].toString().trim()
        : "";
  });
  console.log("🔍 Hash String Before Hashing:", hashString);
  // Convert digest to uppercase
  return crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
};

// Generate TransactionRequestDate in ddMMyyyyHHmmss format
const generateTransactionDate = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return dd + MM + yyyy + HH + mm + ss;
};

exports.initiatePayment = async (req, res) => {
  try {
    console.log("🔄 Initiating Payment...");

    const {
      amount,
      bankId,
      language,
      merchantId,
      pun,
      nationalId,
      description,
    } = req.body;

    const requiredFields = [
      "amount",
      "bankId",
      "merchantId",
      "pun",
      "description",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Convert amount to smallest currency unit (ISO formatted) by multiplying by 100
    const formattedAmount = Math.round(parseFloat(amount) * 100).toString();

    // Truncate PUN to maximum of 20 characters per QPay documentation
    const truncatedPUN = pun.trim().substring(0, 20);

    // Prepare payment data with trimmed values and the truncated PUN for both fields
    const paymentData = {
      Action: "0",
      Amount: formattedAmount,
      BankID: bankId.trim(),
      CurrencyCode: "634",
      ExtraFields_f14: REDIRECT_URL,
      // Use "En" as default language per documentation sample
      Lang: language && language.trim() ? language.trim() : "En",
      MerchantID: merchantId.trim(),
      // Use the truncated PUN for both PUN and MerchantModuleSessionID
      MerchantModuleSessionID: truncatedPUN,
      PUN: truncatedPUN,
      PaymentDescription: description.trim(),
      Quantity: "1",
      TransactionRequestDate: generateTransactionDate(),
      NationalID:
        nationalId && nationalId.trim() !== ""
          ? nationalId.trim()
          : "7483885725",
    };

    // Log each field to verify values
    console.log("✅ Payment Data Fields:");
    Object.entries(paymentData).forEach(([key, value]) => {
      console.log(`    ${key}: "${value}"`);
    });

    // Generate the secure hash using the secret key (trimmed) and fixed field order
    paymentData.SecureHash = generateSecureHash(
      paymentData,
      process.env.QPAY_SECRET_KEY.trim()
    );

    console.log("✅ SecureHash Generated:", paymentData.SecureHash);
    console.log(
      "✅ Final Payment Data (Sent to QPay):",
      JSON.stringify(paymentData, null, 2)
    );

    console.log(
      "🔍 Sending Request to QPay:",
      querystring.stringify(paymentData)
    );
    console.log("🔍 Headers Used:", {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    // Send the request to QPay via POST
    const qpayResponse = await axios.post(
      process.env.QPAY_REDIRECT_URL,
      querystring.stringify(paymentData),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("✅ QPay Response:", qpayResponse.data);

    res.json({
      status: "success",
      redirectUrl: process.env.QPAY_REDIRECT_URL,
      paymentData,
    });
  } catch (error) {
    console.error(
      "❌ Payment initiation error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      status: "error",
      message: "Payment initiation failed",
      details: error.response ? error.response.data : error.message,
    });
  }
};

exports.handlePaymentResponse = async (req, res) => {
  try {
    console.log("🔄 Handling Payment Response...");
    console.log("✅ Full Response Data:", req.body); // ✅ Log full response data

    const responseParams = req.body;
    const receivedSecureHash = responseParams["Response.SecureHash"];

    if (!receivedSecureHash) {
      console.error("❌ Missing Secure Hash in Response");
      return res.status(400).json({
        status: "error",
        message: "Missing Secure Hash in Response",
      });
    }

    // ✅ Remove SecureHash before validation
    delete responseParams["Response.SecureHash"];

    // ✅ Sort response parameters alphabetically
    const sortedParams = Object.keys(responseParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = responseParams[key];
        return acc;
      }, {});

    // ✅ Generate secure hash for validation
    const hashString =
      process.env.QPAY_SECRET_KEY + Object.values(sortedParams).join("");
    const generatedSecureHash = crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");

    console.log("✅ Generated Secure Hash:", generatedSecureHash);
    console.log("✅ Received Secure Hash:", receivedSecureHash);

    // ✅ Validate hash
    if (receivedSecureHash !== generatedSecureHash) {
      console.error("❌ Secure Hash Validation Failed!");
      return res.status(400).json({
        status: "error",
        message: "Invalid secure hash",
      });
    }

    // ✅ Extract Payment Details
    const paymentStatus = responseParams["Response.Status"];
    const confirmationID = responseParams["Response.ConfirmationID"];
    const transactionID = responseParams["Response.PUN"];

    console.log("✅ Payment Successful:", {
      transactionID,
      confirmationID,
      paymentStatus,
    });

    res.json({
      status: "success",
      data: {
        paymentStatus,
        confirmationID,
        transactionDetails: responseParams,
      },
    });
  } catch (error) {
    console.error("❌ Payment response handling error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process payment response",
    });
  }
};
