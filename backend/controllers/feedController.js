const { getTrends } = require("./trendController");

const getFeed = async (req, res) => {
  try {
    const user = req.user;

    // 🔥 1. récupérer trends depuis trendController
    const fakeReq = {};
    let trends;

    const trendsPromise = new Promise((resolve) => {
      const fakeRes = {
        status: () => ({
          json: (data) => resolve(data)
        })
      };

      getTrends(fakeReq, fakeRes);
    });

    trends = await trendsPromise;

    // 🔥 2. sécurité
    if (!Array.isArray(trends)) trends = [];

    // 🔥 3. personnalisation
    let filteredTrends = trends;

    if (user && user.preferences && user.preferences.length > 0) {
      filteredTrends = trends.filter(trend =>
        user.preferences.some(pref =>
          trend.title.toLowerCase().includes(pref.toLowerCase())
        )
      );
    }

    // 🔥 4. fallback si rien trouvé
    const finalTrends = filteredTrends.length > 0 ? filteredTrends : trends;

    // 🔥 5. format feed propre (SANS FAKE)
    const feed = finalTrends.map((trend, index) => ({
      id: index + 1,
      title: trend.title,
      score: trend.score,
      analysis: trend.analysis,
      idea: trend.idea,
      source: trend.source,
      link: trend.link || "",
      createdAt: new Date()
    }));

    res.status(200).json(feed);

  } catch (error) {
    console.error("FEED ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getFeed };