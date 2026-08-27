import nodemailer from 'nodemailer'

async function testHost(host, port, secure) {
  console.log(`Probando ${host}:${port} secure=${secure}...`)
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: 'no-reply@minerquim.cl',
      pass: 'Empresa_1000'
    },
    authMethod: 'LOGIN',
    tls: { rejectUnauthorized: false }
  })

  try {
    const verified = await transporter.verify()
    console.log(`✅ VERIFY EXITO (${host}:${port}):`, verified)

    const info = await transporter.sendMail({
      from: 'no-reply@minerquim.cl',
      to: 'juanpablo.vasquezk@gmail.com',
      subject: 'Prueba SMTP Directa',
      text: 'Prueba de envio'
    })
    console.log(`✅ SENDMAIL EXITO (${host}:${port}):`, info.messageId)
  } catch (err) {
    console.error(`❌ ERROR (${host}:${port}):`, err.message)
  }
}

async function main() {
  await testHost('smtp.hostinger.com', 465, true)
  await testHost('smtp.hostinger.com', 587, false)
  await testHost('mail.minerquim.cl', 465, true)
  await testHost('mail.minerquim.cl', 587, false)
}

main().catch(console.error)
