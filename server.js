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
// Paystack API key (replace with your actual Paystack API key)
const paystackSecretKey = process.env.PAYSTAC_KEY;


app.use(express.json()); // Middleware for parsing JSON


app.use(cors());

app.post("/api/initiate-payment", async (req, res) => {
	try {
		const { amount, email, metadata } = req.body || {};


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


// Paystack Webhook endpoint
app.post("/paystack-webhook", async (req, res) => {
  try {
    // Verify Paystack signature (implement this based on Paystack documentation)

    // Extract necessary data from Paystack webhook event
    const { email, amount } = req.body.data;

    // Make a post request to the order endpoint
    const orderResponse = await axios.post(
      "https://backendv2-smz4.onrender.com/api/order",
      {
        orderer: email,
        order: [amount.toString()], // Assuming amount is a number, convert it to a string or adjust as needed
      }
    );

    // Check the order response if needed
    console.log("Order response:", orderResponse.data);

    // Acknowledge receipt of Paystack webhook event
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error handling Paystack webhook:", error);
    res.status(500).json({ status: "error" });
  }
});


app.listen(port, () => {
	console.log(
		`Server is running at http://localhost:${port}`
	);
});
