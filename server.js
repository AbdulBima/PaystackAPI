require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = process.env.PORT;
const crypto = require('crypto');


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
		// Verify Paystack signature
		const hash = crypto
			.createHmac("sha512", paystackSecretKey)
			.update(JSON.stringify(req.body))
			.digest("hex");
		if (hash !== req.headers["x-paystack-signature"]) {
			console.error(
				"Paystack signature verification failed"
			);
			return res
				.status(403)
				.json({
					status: "error",
					message:
						"Paystack signature verification failed",
				});
		}

		// Extract necessary data from Paystack webhook event
		const { data: webhookResponse } = req.body;
		console.log(webhookResponse);

		// Extract metadata from webhook response
		const metadata = webhookResponse.metadata;

		if (!metadata || !metadata.custom_fields) {
			console.error(
				"Metadata or custom_fields is missing in Paystack webhook payload."
			);
			return res
				.status(400)
				.json({
					status: "error",
					message:
						"Invalid Paystack webhook payload.",
				});
		}

		// Find the custom field with variable_name "cart_products"
		const cartProductsField =
			metadata.custom_fields.find(
				(field) =>
					field.variable_name === "cart_products"
			);
		const userIdField = metadata.custom_fields.find(
			(field) => field.variable_name === "user._id"
		);

		if (!userIdField || !cartProductsField) {
			console.error(
				"User ID or cart products field is missing in Paystack webhook payload."
			);
			return res
				.status(400)
				.json({
					status: "error",
					message:
						"User ID and cart products field are required.",
				});
		}

		const userId = userIdField.value;

		// Parse the cart_products value (assuming it was stringified JSON)
		const cartProducts = JSON.parse(
			cartProductsField.value
		);

		// Extract other necessary data from Paystack webhook event
		const customerEmail =
			webhookResponse.customer.email;
		const amount = webhookResponse.amount;

		// Make a post request to the order endpoint with the correct content type
		const orderResponse = await axios.post(
			"https://backendv2-smz4.onrender.com/api/order/",
			{
				ordererId: userId,
				ordererEmail: customerEmail,
				order: cartProducts,
				orderAmount: amount,
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		// Check the order
		console.log("Order response:", orderResponse.data);

		// Acknowledge receipt of Paystack webhook event
		res.json({ status: "success" });
	} catch (error) {
		console.error(
			"Error handling Paystack webhook:",
			error
		);
		res.status(500).json({ status: "error" });
	}
});

app.listen(port, () => {
	console.log(
		`Server is running at http://localhost:${port}`
	);
});
