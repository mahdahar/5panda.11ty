module.exports = function (eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/js");

  // Watch targets
  eleventyConfig.addWatchTarget("src/css");

  // Add year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Add date filter for formatting
  eleventyConfig.addFilter("dateFormat", (date, format = "full") => {
    const d = new Date(date);
    const options = {
      full: { year: 'numeric', month: 'long', day: 'numeric' },
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      iso: null,
    };

    if (format === "iso") {
      return d.toISOString().split('T')[0];
    }

    return d.toLocaleDateString('en-US', options[format] || options.full);
  });

  // Add reading time filter
  eleventyConfig.addFilter("readingTime", (content) => {
    if (!content) return "1 min read";
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  });

  // Add excerpt filter
  eleventyConfig.addFilter("excerpt", (content, length = 150) => {
    if (!content) return "";
    const text = content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
    return text.length > length ? text.slice(0, length) + '...' : text;
  });

  // Add head filter (get first n items from array)
  eleventyConfig.addFilter("head", (array, n) => {
    if (!Array.isArray(array)) return [];
    if (n < 0) {
      return array.slice(n);
    }
    return array.slice(0, n);
  });

  // Collections
  // Blog posts / Proposals collection
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/**/*.md").sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["html", "njk", "md"]
  };
};
