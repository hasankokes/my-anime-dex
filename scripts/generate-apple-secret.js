const jwt = require('jsonwebtoken');
const fs = require('fs');

const args = process.argv.slice(2);

if (args.length < 4) {
    console.log('Usage: node generate-apple-secret.js <path_to_private_key.p8> <team_id> <key_id> <client_id>');
    console.log('Example: node generate-apple-secret.js ./AuthKey_12345678.p8 TEAM123 KEY123 com.example.app');
    process.exit(1);
}

const [privateKeyPath, teamId, keyId, clientId] = args;

try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    const token = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '180d', // 6 months, max allowed by Apple
        audience: 'https://appleid.apple.com',
        issuer: teamId,
        subject: clientId,
        keyid: keyId,
    });

    console.log('\n--- Apple Client Secret (JWT) ---');
    console.log(token);
    console.log('---------------------------------\n');
    console.log('Copy the above token and paste it into Supabase -> Authentication -> Providers -> Apple -> Secret Key');

} catch (error) {
    console.error('Error generating token:', error.message);
}
