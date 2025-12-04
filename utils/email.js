import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const resend = new Resend(process.env.RESEND_KEY);
const sendEmail = async (options) => {
    try {
        const data = await resend.emails.send({
            from: 'Selamy <noreply@selamy.me>',
            to: options.email,
            subject: options.subject,
            html: options.html
        })
        console.log("Email sent (Resend ID):", data.id);
        return data;
    } catch (error) {
        console.error("Resend Error:", error);
        throw new Error("Email couldnt be sent: " + error.message);
    }
}

/*
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"SelamY Blog" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    await transporter.sendMail(mailOptions);
}
*/
export default sendEmail;