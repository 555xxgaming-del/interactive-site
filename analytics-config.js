window.ANALYTICS_CONFIG = {
  // Turn on/off each provider. IDs are required for activation.
  providers: {
    plausible: {
      enabled: true,
      domain: "555xxgaming-del.github.io",
      scriptUrl: "https://plausible.io/js/script.js"
    },
    goatcounter: {
      enabled: false,
      code: "" // e.g. "your-code" for https://your-code.goatcounter.com/count
    },
    ga4: {
      enabled: false,
      measurementId: "" // e.g. "G-XXXXXXXXXX"
    },
    clarity: {
      enabled: false,
      projectId: "" // e.g. "abcd1234"
    }
  },
  localMetrics: {
    enabled: true,
    storageKey: "site_metrics_v1"
  }
};
