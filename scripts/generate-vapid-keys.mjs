import webPush from "web-push";

const keys = webPush.generateVAPIDKeys();

process.stdout.write(
  [
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
    "VAPID_SUBJECT=mailto:seu-email@exemplo.com"
  ].join("\n")
);
