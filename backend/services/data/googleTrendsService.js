const logger = require('../../utils/logger');
const axios = require("axios");
const googleTrends = require("google-trends-api");
const { GOOGLE_TRENDS_LIMIT } = require("../../config/config");

const {
  cleanTitle,
  validateTrend,
  estimateSentimentScore,
} = require("./cleaner");

const API_KEY = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
const GEO_INTEREST_LIMIT = Math.max(0, Number(process.env.GOOGLE_TRENDS_GEO_LIMIT || 20));
const GEO_INTEREST_TIMEOUT_MS = 6000;
const GEO_INTEREST_DAYS = Math.max(1, Number(process.env.GOOGLE_TRENDS_GEO_DAYS || 7));

const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const digits = value.replace(/[^\d.-]/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
};

const normalizeGeoInterest = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => {
    const countryCode = String(item.geo || item.geoCode || '').trim().toUpperCase();
    const country = String(item.location || item.geoName || '').trim();
    const rawValue = Array.isArray(item.value) ? item.value[0] : item.value;
    const value = parseNumber(item.extracted_value ?? rawValue);

    if (!countryCode || countryCode.length !== 2 || !country || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return {
      country,
      countryCode,
      value
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.value - a.value)
  .slice(0, 25);

const extractGoogleTrendsQuery = (link = "") => {
  try {
    const url = new URL(String(link || ""));
    return url.searchParams.get("q") || "";
  } catch {
    return "";
  }
};

const getInterestByRegion = async (query) => {
  if (!query) return [];

  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - GEO_INTEREST_DAYS * 24 * 60 * 60 * 1000);
    const request = googleTrends.interestByRegion({
      keyword: query,
      startTime,
      endTime,
      resolution: "COUNTRY",
      hl: "en-US",
    });
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`timeout of ${GEO_INTEREST_TIMEOUT_MS}ms exceeded`)), GEO_INTEREST_TIMEOUT_MS);
    });
    const raw = await Promise.race([request, timeout]);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;

    return normalizeGeoInterest(data?.default?.geoMapData || []);
  } catch (error) {
    logger.warn("[Google Trends] interest by region unavailable", {
      query,
      message: error.message
    });
    return [];
  }
};

const enrichWithGeoInterest = async (trends = []) => {
  if (!GEO_INTEREST_LIMIT) return trends;

  const enriched = [];
  for (const trend of trends) {
    if (enriched.length < GEO_INTEREST_LIMIT) {
      const geoInterest = await getInterestByRegion(trend.rawQuery || trend.title);
      enriched.push({
        ...trend,
        geoInterest
      });
    } else {
      enriched.push(trend);
    }
  }

  return enriched;
};

const getGoogleTrends = async () => {
  try {
    const response = await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          engine: "google_trends_trending_now",
          geo: "US",
          api_key: API_KEY,
        },
        timeout: 5000,
      }
    );

    const raw = response.data.trending_searches || [];

    const rawTrends = raw
      .map((trend) => {
        if (!trend || !trend.query) return null;

        const title = cleanTitle(trend.query);
        if (!title) return null;

        const searchVolume = parseNumber(trend.value || trend.formatted_value || trend.traffic || trend.search_volume);
        const deltaValue = trend.delta ? parseNumber(trend.delta.value || trend.delta || trend.delta_percentage || trend.delta_percentage_str) : 0;

        const data = {
          title,
          popularity: searchVolume,
          growth: deltaValue,
          source: "Google Trends",
          link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.query)}`,
          fetchedAt: new Date(),
          rawQuery: trend.query,
          searchVolume,
          deltaValue,
          sentiment: estimateSentimentScore(trend.query),
          tags: title
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3)
            .slice(0, 4),
          excerpt: `Search interest is rising for "${title}" across the US.`
        };

        return validateTrend(data) ? data : null;
      })
      .filter(Boolean)
      .slice(0, Math.max(50, Number(GOOGLE_TRENDS_LIMIT || 120)));

    return enrichWithGeoInterest(rawTrends);

  } catch (error) {
    const serviceError = new Error(`Google Trends service failed: ${error.message}`);
    serviceError.statusCode = 502;
    throw serviceError;
  }
};

module.exports = { getGoogleTrends, normalizeGeoInterest, getInterestByRegion, extractGoogleTrendsQuery };

