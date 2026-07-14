const { gmailApiInstance } = require("./GmailApiSender");


async function testEmail() {

  const res = await gmailApiInstance.sendEmail(
    'grseweb@gmail.com',
    "kamal.ruidas@datacoresystems.co.in",
    "Test Email",
    "<h1>Hello!</h1>",
    true
  );

  console.log(res);
}
testEmail();
