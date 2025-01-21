const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin:"https://doha-payment.vercel.app",
  credentials: true,
}));

const PORT = process.env.PORT || 8080;
const QPAY_URL = 'https://pguat.qcb.gov.qa/qcb-pg/api/gateway/2.0';
const SECRET_KEY = process.env.QPAY_SECRET_KEY;
const MERCHANT_ID = process.env.QPAY_MERCHANT_ID;
// const BANK_ID = process.env.QPAY_BANK_ID;
const REDIRECT_URL = 'https://doha-payment.vercel.app/payment-response';

// Generate Secure Hash
function generateSecureHash(params) {
  const orderedParams = [
    'Action', 'Amount', 'BankID', 'CurrencyCode', 'ExtraFields_f14', 'Lang',
    'MerchantID', 'MerchantModuleSessionID', 'NationalID', 'PUN',
    'PaymentDescription', 'Quantity', 'TransactionRequestDate'
  ];
  const hashString = SECRET_KEY + orderedParams.map(key => params[key]).join('');
  return crypto.createHash('sha256').update(hashString).digest('hex');
}



app.post('/payment/request', (req, res) => {
  try {
    const { amount, description } = req.body;
    console.log("Amount received", amount, description);
    
    const PUN = crypto.randomBytes(16).toString('hex');
    const TransactionRequestDate = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

    const paymentData = {
      Action: '0',
      Amount: amount,
      BankID: 'QPAYPG03',
      CurrencyCode: '634',
      ExtraFields_f14: REDIRECT_URL,
      Lang: 'en',
      MerchantID: MERCHANT_ID,
      MerchantModuleSessionID: PUN,
      NationalID: '',
      PUN,
      PaymentDescription: description,
      Quantity: '1',
      TransactionRequestDate,
    };

    paymentData.SecureHash = generateSecureHash(paymentData);
    console.log("Final Response Sent to Frontend:", { url: QPAY_URL, paymentData });
return res.json({ url: QPAY_URL, paymentData });

  } catch (error) {
    console.log("Error is",error);
    console.error('Error processing payment request:', error);
   return res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/payment/response', (req, res) => {
  const response = req.body;
  console.log("Response from request is: ",response)
  const receivedHash = response.SecureHash;
console.log("Received hash: ",receivedHash)
  const computedHash = generateSecureHash(response);
  console.log("Computed hash: ",computedHash)
  if (computedHash === receivedHash) {
    res.json({ status: 'success', message: 'Payment verified!' });
  } else {
    res.json({ status: 'failure', message: 'Payment verification failed!' });
  }
});
app.get('/',(req,res)=>{
res.send(`<h1 style="text-align:center;color:green"
  >Websitw is running</h1>`)
})
app.listen(PORT, () => console.log(`Server running on port vthis ${PORT}`));