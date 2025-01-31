import env from '@/env'
import Mailjet from 'node-mailjet'

const mailjet = Mailjet.apiConnect(env.MAILJET_API_KEY, env.MAILJET_SECRET_KEY);

type ReceiverType = {
    Email: string,
    Name: string
}

export const sendMail = async (receiver: ReceiverType[], Subject: string, verification_link: string) => {
    const html = `
<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikacija e-pošte</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background: #007bff;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
        }
        .button:hover {
            background: #0056b3;
        }
        .footer {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Tvoj Brend</div>
        <div class="message">Zdravo, <strong>${receiver[0].Name}</strong>!<br>
            Hvala što ste se registrovali. Kliknite na dugme ispod da verifikujete svoju e-poštu.</div>
        <a href="${verification_link}" class="button">Verifikuj e-mail</a>
        <div class="footer">Ako niste vi zatražili ovu registraciju, možete zanemariti ovaj e-mail.</div>
    </div>
</body>
</html>
`
    const req = await mailjet.post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: "hi@boge.dev",
                        Name: "Bogdan Stevanovic"
                    },
                    To: receiver,
                    Subject,
                    HTMLPart: html
                }
            ]
        })
    console.log(req.body);
}

