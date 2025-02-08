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
const querystring = require("querystring");

// Function to generate SHA-256 Secure Hash
const generateSecureHash = (data, secretKey) => {
  // Order fields as per QPay documentation
  const hashString = [
    secretKey, // Secret key should be the first parameter
    data.Action || "0",
    data.Amount,
    data.BankID,
    data.CurrencyCode || "634", // Currency Code for QAR
    data.ExtraFields_f14,
    data.Lang || "EN",
    data.MerchantID,
    data.MerchantModuleSessionID,
    data.NationalID,
    data.PUN,
    data.PaymentDescription,
    data.Quantity || "1",
    data.TransactionRequestDate,
  ]
    .filter(Boolean) // Remove empty fields
    .join("");

  return crypto.createHash("sha256").update(hashString).digest("hex");
};

// Controller function to initiate payment
exports.initiatePayment = async (req, res) => {
  try {
    console.log("Initiating Payment...");
    console.log(req.body);

    const {
      amount,
      bankId,
      extraField,
      language,
      merchantId,
      pun,
      nationalId,
      description,
      transactionRequestDate,
    } = req.body;

    // Validate Required Fields
    const requiredFields = [
      "amount",
      "bankId",
      "merchantId",
      "pun",
      "description",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    console.log(missingFields);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Construct Payment Data
    const paymentData = {
      Action: "0", // Payment Action
      Amount: amount,
      BankID: bankId,
      CurrencyCode: "634", // QAR Currency Code
      ExtraFields_f14: process.env.QPAY_RESPONSE_URL, // Redirect URL
      Lang: language || "EN",
      MerchantID: merchantId,
      MerchantModuleSessionID: pun, // Unique session ID
      NationalID: nationalId || "",
      PUN: pun, // Unique Payment Number
      PaymentDescription: description,
      Quantity: "1", // Default quantity
      TransactionRequestDate: transactionRequestDate,
    };

    // Generate Secure Hash
    const secureHash = generateSecureHash(
      paymentData,
      process.env.QPAY_SECRET_KEY
    );
    paymentData.SecureHash = secureHash;

    // QPay Redirect URL
    const qpayRedirectUrl = process.env.QPAY_REDIRECT_URL;

    // Create Payment Query String
    const paymentQueryString = querystring.stringify(paymentData);

    // Redirect User to QPay Payment Page
    res.json({
      status: "success",
      redirectUrl: `${qpayRedirectUrl}?${paymentQueryString}`,
    });
  } catch (error) {
    console.log(error);

    console.error("Payment initiation error:", error);
    res.status(500).json({
      status: "error",
      message: "Payment initiation failed",
    });
  }
};

exports.handlePaymentResponse = async (req, res) => {
  try {
    console.log("Handling Payment Response...");

    const responseParams = req.body; // Payment response from QPay
    const receivedSecureHash = responseParams["Response.SecureHash"];

    // Remove SecureHash before validation
    delete responseParams["Response.SecureHash"];

    // Sort response parameters alphabetically
    const sortedParams = Object.keys(responseParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = responseParams[key];
        return acc;
      }, {});

    // Generate secure hash for validation
    const hashString =
      process.env.QPAY_SECRET_KEY + Object.values(sortedParams).join("");
    const generatedSecureHash = crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");

    // Validate hash
    if (receivedSecureHash !== generatedSecureHash) {
      return res.status(400).json({
        status: "error",
        message: "Invalid secure hash",
      });
    }

    // Payment status
    const paymentStatus = responseParams["Response.Status"];
    const confirmationID = responseParams["Response.ConfirmationID"];
    const transactionID = responseParams["Response.PUN"];

    // need to implement DATABASE lOGIC here

    res.json({
      status: "success",
      data: {
        paymentStatus,
        confirmationID,
        transactionDetails: responseParams,
      },
    });
  } catch (error) {
    console.error("Payment response handling error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process payment response",
    });
  }
};
