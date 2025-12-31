# LanguageTool Docker image optimized for Catalan
FROM erikvl87/languagetool:latest

# The base image already includes LanguageTool with all languages including Catalan
# Expose the default LanguageTool port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8010/v2/languages || exit 1
