const nodemailer = require("nodemailer");

const submissionTimestamps = new Map(); // key: email, value: timestamp

exports.handler = async (event) => {
  console.log("Function invoked. Event method:", event.httpMethod);

  try {
    const data = JSON.parse(event.body).payload;
    const { name, email, message } = data.data;
    console.log("Parsed form submission:", { name, email, message });

    // === Rate limit: 1 submission per 5 minutes per email ===
    const now = Date.now();
    const last = submissionTimestamps.get(email);
    if (last && now - last < 5 * 60 * 1000) {
      console.warn(`Rate limit hit for: ${email}`);
      return {
        statusCode: 429,
        body: "You have already submitted recently. Please wait a few minutes.",
      };
    }
    submissionTimestamps.set(email, now);
    console.log("Rate limit passed.");

    // === SMTP Transport ===
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    console.log("SMTP config:", {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
    });

    const transporter = nodemailer.createTransport(smtpConfig);

    const mailOptions = {
      from: `"Circleytics" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Thank you for contacting us!",
      text: `Hi ${name},\n\nWe received your message:\n"${message}"\n\nWe'll be in touch shortly.\n\n– Team`,
    };

    console.log("Sending mail to:", email);
    await transporter.sendMail(mailOptions);
    console.log("Mail sent successfully.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Confirmation email sent. Redirecting to success page.",
      }),
      headers: {
        Location: "/success.html",
      },
    };
  } catch (err) {
    console.error("Unhandled error:", err);
    return {
      statusCode: 500,
      body: "Failed to process form submission.",
    };
  }
};
