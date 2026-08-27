import nodemailer from 'nodemailer'

async function testSmtp(port, secure) {
  console.log(`Probando SMTP host: mail.minerquim.cl, port: ${port}, secure: ${secure}...`)
  const transporter = nodemailer.createTransport({
    host: 'mail.minerquim.cl',
    port: port,
    secure: secure,
    auth: {
      user: 'no-reply@minerquim.cl',
      pass: 'Empresa_1000'
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  try {
    const verified = await transporter.verify()
    console.log(`VERIFY EXITO (port ${port}, secure ${secure}):`, verified)

    const info = await transporter.sendMail({
      from: '"Control Fauna Minerquim" <no-reply@minerquim.cl>',
      to: 'juanpablo.vasquezk@gmail.com',
      subject: 'Prueba SMTP Control Fauna',
      text: 'Este es un correo de prueba de conexion SMTP.'
    })
    console.log(`SENDMAIL EXITO (port ${port}):`, info.messageId)
  } catch (err) {
    console.error(`ERROR (port ${port}):`, err.message)
  }
}

async function main() {
  await testSmtp(465, true)
  await testSmtp(587, false)
}

main().catch(console.error)
