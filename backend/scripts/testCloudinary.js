const cloudinary = require('../config/cloudinary');

(async () => {
  try {
    const cloudNameSet = Boolean(process.env.CLOUDINARY_CLOUD_NAME);
    const apiKeySet = Boolean(process.env.CLOUDINARY_API_KEY);
    const apiSecretSet = Boolean(process.env.CLOUDINARY_API_SECRET);

    console.log('Cloudinary env present:', {
      cloudName: cloudNameSet,
      apiKey: apiKeySet,
      apiSecret: apiSecretSet
    });

    const ping = await cloudinary.api.ping();
    console.log('Ping OK:', ping);

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YzbVtEAAAAASUVORK5CYII=';
    const uploadRes = await cloudinary.uploader.upload(dataUrl, { folder: 'connectivity-test' });
    console.log('Upload OK:', { secure_url: uploadRes.secure_url, public_id: uploadRes.public_id });
    process.exit(0);
  } catch (err) {
    const details = err && err.error ? err.error : err;
    console.error('Cloudinary test failed:', {
      name: details && details.name,
      message: details && details.message,
      http_code: details && details.http_code,
      error: details
    });
    process.exit(1);
  }
})();



