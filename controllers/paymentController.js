// const crypto = require('crypto');

// const generateSecureHash = (data, secretKey) => {
//   const hashBuilder = [
//     secretKey,
//     data.Action || '0',
//     data.amount,
//     data.bankId,
//     '634', // CurrencyCode
//     data.extraField,
//     data.language,
//     data.merchantId,
//     data.pun,
//     data.nationalId,
//     data.pun, // MerchantModuleSessionID same as PUN
//     data.description,
//     '1', // Quantity
//     data.transactionRequestDate
//   ].join('');

//   return crypto.createHash('sha256').update(hashBuilder).digest('hex');
// };

// exports.initiatePayment = async (req, res) => {
//   console.log("Controller dcaled")
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
//       transactionRequestDate
//     } = req.body;

//     // Validate required fields
//     const requiredFields = ['amount', 'bankId', 'merchantId', 'nationalId', 'description'];
//     const missingFields = requiredFields.filter(field => !req.body[field]);
//     console.log("Missing required fields", missingFields);
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         status: 'error',
//         message: `Missing required fields: ${missingFields.join(', ')}`
//       });
//     }

//     const paymentData = {
//       Action: '0',
//       amount,
//       bankId,
//       CurrencyCode: '634',
//       extraField: extraField || '',
//       language: language || 'EN',
//       merchantId,
//       pun,
//       nationalId,
//       description,
//       Quantity: '1',
//       transactionRequestDate
//     };
// console.lo
//     const secureHash = generateSecureHash(paymentData, process.env.QPAY_SECRET_KEY);
// console.log("Secure Hash: " + secureHash);
//     const responseData = {
//       ...paymentData,
//       SecureHash: secureHash,
//       PG_REDIRECT_URL: process.env.QPAY_REDIRECT_URL
//     };

//     res.json({
//       status: 'success',
//       data: responseData
//     });

//   } catch (error) {
//     console.log("Errro from,",error);
//     console.error('Payment initiation error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Payment initiation failed'
//     });
//   }
// };

// exports.handlePaymentResponse = async (req, res) => {
//   try {
//     const responseParams = req.body;
//     const receivedSecureHash = responseParams['Response.SecureHash'];
    
//     // Remove SecureHash before validation
//     delete responseParams['Response.SecureHash'];
    
//     // Sort parameters alphabetically
//     const sortedParams = Object.keys(responseParams)
//       .sort()
//       .reduce((acc, key) => {
//         acc[key] = responseParams[key];
//         return acc;
//       }, {});

//     // Generate validation hash
//     const hashString = process.env.QPAY_SECRET_KEY + Object.values(sortedParams).join('');
//     const generatedSecureHash = crypto
//       .createHash('sha256')
//       .update(hashString)
//       .digest('hex');

//     // Validate secure hash
//     if (receivedSecureHash !== generatedSecureHash) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'Invalid secure hash'
//       });
//     }

//     // Process payment status
//     const paymentStatus = responseParams['Response.Status'];
    
//     // Store transaction in database
//     // Add your database logic here
    
//     res.json({
//       status: 'success',
//       data: {
//         paymentStatus,
//         transactionDetails: responseParams
//       }
//     });

//   } catch (error) {
//     console.error('Payment response handling error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Failed to process payment response'
//     });
//   }
// };