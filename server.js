require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = process.env.PORT;

const FRONTEND = process.env.FRONTEND;
const corsOptions = {
	origin: FRONTEND,
	optionSuccessStatus: 200,
};
Paystack API key (replace with your actual Paystack API key)
const paystackSecretKey = process.env.PAYSTAC_KEY;
const bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use(cors());

app.post("/api/initiate-payment", async (req, res) => {
	try {
		const { amount, email, metadata } = req.body;

		// Paystack API endpoint for initializing a transaction
		const paystackInitiateUrl =
			"https://api.paystack.co/transaction/initialize";

		// Make request to Paystack to initialize the transaction
		const paystackResponse = await axios.post(
			paystackInitiateUrl,
			{
				email,
				amount,
				metadata,
			},
			{
				headers: {
					Authorization: `Bearer ${paystackSecretKey}`,
					"Content-Type": "application/json",
				},
			}
		);

		const authorizationUrl =
			paystackResponse.data.data.authorization_url;

		// Respond with the authorization URL to the frontend
		res.json({ authorization_url: authorizationUrl });
	} catch (error) {
		console.error("Error initiating payment:", error);
		// Handle error and respond with an appropriate status
		res.status(500).json({
			error: "Internal Server Error",
		});
	}
});

app.post('/paystack-webhook', async (req, res) => {
  try {
    // Handle the webhook payload
    const payload = req.body;

    // Access metadata
    const metadata = payload.data.metadata;

    // Access specific metadata field (e.g., cart_products)
    const cartProducts = metadata.custom_fields.find(field => field.variable_name === 'cart_products');

    // Make a POST request to your /api/order/ endpoint
  
		await axios.post('https://backendv2-smz4.onrender.com/api/order/', {
      orderer: 'default@example.com', // You can use your default email here
      order: cartProducts ? JSON.parse(cartProducts.value) : [],
    });
    // Respond to Paystack to acknowledge receipt
    res.status(200).send('Webhook received successfully.');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.listen(port, () => {
	console.log(
		`Server is running at http://localhost:${port}`
	);
});
