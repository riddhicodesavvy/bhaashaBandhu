export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      status: 'ok',
      url: req.url,
      nodeVersion: process.version,
      matchedPath: req.headers['x-matched-path'] || null,
      time: Date.now()
    })
  );
}
