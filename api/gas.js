module.exports = async function handler(req, res) {
  const gasUrl = process.env.GAS_WEB_APP_URL;

  if (!gasUrl) {
    return res.status(500).json({
      success: false,
      pesan: "Missing GAS_WEB_APP_URL environment variable.",
    });
  }

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      success: false,
      pesan: "Method not allowed.",
    });
  }

  try {
    const target = new URL(gasUrl);
    const incoming = new URL(req.url, "http://localhost");

    incoming.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });

    if (process.env.GAS_API_SECRET) {
      target.searchParams.set("apiSecret", process.env.GAS_API_SECRET);
    }

    const fetchOptions = {
      method: req.method,
      redirect: "follow",
    };

    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      fetchOptions.headers = {
        "Content-Type": "text/plain;charset=utf-8",
      };
      fetchOptions.body = JSON.stringify({
        ...body,
        apiSecret: process.env.GAS_API_SECRET || body.apiSecret,
      });
    }

    const response = await fetch(target.toString(), fetchOptions);
    const text = await response.text();

    res.setHeader("Cache-Control", "no-store");

    try {
      return res.status(response.ok ? 200 : response.status).json(JSON.parse(text));
    } catch {
      return res.status(response.ok ? 200 : response.status).send(text);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      pesan: error.message || "Proxy request failed.",
    });
  }
};
