// Generates a VAPID key pair for Web Push (pup hunger reminders), using only Node's crypto.
// Usage: npm run vapid-keys
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);

process.stdout.write(
  `VAPID_PUBLIC_KEY=${raw.toString('base64url')}\nVAPID_PRIVATE_KEY=${priv.d}\n\n` +
    'Put the public key in VITE_VAPID_PUBLIC_KEY (repo variable) and both keys in the Supabase function secrets.\n',
);
