(() => {
  "use strict";

  if (window.GYXDeliveryContent) return;

  const I = window.GYXI18N;

  function normalize(text) {
    return String(text ?? "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function htmlToText(value) {
    const source = normalize(value);
    if (!source) return "";
    if (!/[<>]|&(?:nbsp|amp|lt|gt|quot|#39);/i.test(source)) return source;
    try {
      const parsed = new DOMParser().parseFromString(source, "text/html");
      parsed.querySelectorAll("script,style,noscript,svg").forEach((node) => node.remove());
      parsed.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
      parsed
        .querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,div,section,article,tr")
        .forEach((node) => node.append("\n"));
      return normalize(parsed.body?.textContent || "");
    } catch (error) {
      console.warn("[GYX delivery] HTML normalization failed; using source text", error);
      return source.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ");
    }
  }

  function rewardText(rewardId, fallbackText) {
    const key = `pointsReward.${String(rewardId || "")}.delivery`;
    if (Object.prototype.hasOwnProperty.call(I.resources.zh, key)) return normalize(I.t(key));
    console.warn(`[GYX delivery] missing ${I.locale}:${key}; fallback=zh snapshot`);
    return normalize(fallbackText);
  }

  function opportunityTitle(row) {
    const key = `communityOpportunity.${String(row?.opportunity_id || "")}.title`;
    const value = I.t(key);
    return value === key ? I.t("communityOpportunityFallback") : value;
  }

  function parseOpportunitySnapshot(snapshot) {
    const normalized = normalize(snapshot);
    const sourceMatch = normalized.match(
      /(?:^|\n)(?:原始地址\s*\/\s*)?Source\s*:\s*(https?:\/\/\S+)\s*$/i,
    );
    const sourceUrl = sourceMatch?.[1] || "";
    const withoutSource = sourceMatch
      ? normalized.slice(0, sourceMatch.index).trim()
      : normalized;
    const firstBreak = withoutSource.indexOf("\n");
    const originalTitle = (firstBreak >= 0 ? withoutSource.slice(0, firstBreak) : withoutSource).trim();
    const body = firstBreak >= 0 ? withoutSource.slice(firstBreak + 1).trim() : "";
    return {
      originalTitle,
      body: htmlToText(body || originalTitle),
      sourceUrl,
    };
  }

  function opportunityText(row) {
    const parsed = parseOpportunitySnapshot(row?.delivery_text_snapshot);
    const localizedBody = normalize(row?.localized_body);
    const localizedSourceUrl = normalize(row?.localized_source_url);
    const steps = [
      I.t("communityClaimS1"),
      I.t("communityClaimS2"),
      I.t("communityClaimS3"),
      I.t("communityClaimS4"),
      I.t("communityClaimS5"),
    ];
    return normalize(
      [
        I.t("communityClaimTitle"),
        opportunityTitle(row),
        "",
        I.t("communityClaimHello"),
        "",
        I.t("communityClaimSteps"),
        ...steps,
        "",
        I.t("communityClaimOriginal"),
        localizedBody || parsed.body || parsed.originalTitle || "-",
        "",
        I.t("communityClaimLink"),
        localizedSourceUrl || parsed.sourceUrl || "-",
        "",
        I.t("communityClaimNote"),
      ].join("\n"),
    );
  }

  window.GYXDeliveryContent = Object.freeze({
    normalize,
    rewardText,
    opportunityText,
  });
})();
