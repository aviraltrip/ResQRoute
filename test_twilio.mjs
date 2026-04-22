import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config({ path: '.env.local' });

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

console.log("SID present:", !!sid);
console.log("Token present:", !!token);
console.log("From Phone present:", !!fromPhone);

if (sid && token) {
  const client = twilio(sid, token);
  client.messages.create({
    body: 'Test Twilio message from ResQRoute',
    from: fromPhone,
    to: '+916363640564'
  }).then(msg => console.log("Success! Message SID:", msg.sid))
    .catch(err => console.error("Twilio error:", err.message));
} else {
  console.log("Missing Twilio credentials in .env.local");
}
