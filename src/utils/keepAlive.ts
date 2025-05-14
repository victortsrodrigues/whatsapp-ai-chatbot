import axios from "axios";
import environment from "../config/environment";
import logger from "./logger";

class KeepAliveService {
  private appTimer: NodeJS.Timeout | null = null;
  private aiServiceTimer: NodeJS.Timeout | null = null;

  public start(): void {
    if (!environment.keepAlive.enabled) {
      logger.info("Keep-alive service is disabled");
      return;
    }

    this.startAppKeepAlive();
    this.startAiServiceKeepAlive();
  }

  private startAppKeepAlive(): void {
    if (!environment.keepAlive.url) {
      logger.warn("App keep-alive URL not configured. Service will not start.");
      return;
    }

    logger.info(
      `Starting app keep-alive service with interval of ${environment.keepAlive.interval}ms`
    );

    if (this.appTimer) {
      clearInterval(this.appTimer);
    }

    // Periodic ping to the app
    this.appTimer = setInterval(async () => {
      try {
        const response = await axios.get(`${environment.keepAlive.url}/health`);
        logger.debug(`App keep-alive ping successful: ${response.status}`);
      } catch (error) {
        logger.error("App keep-alive ping failed:", error);
      }
    }, environment.keepAlive.interval);
  }

  private startAiServiceKeepAlive(): void {
    if (!environment.keepAlive.aiServiceKeepAlive) {
      logger.info("AI service keep-alive is disabled");
      return;
    }

    // Extract the base URL from the AI service URL
    const aiServiceBaseUrl = this.extractBaseUrl(environment.ai.serviceUrl);
    if (!aiServiceBaseUrl) {
      logger.warn(
        "Could not determine AI service base URL. AI service keep-alive will not start."
      );
      return;
    }

    const aiHealthEndpoint = environment.ai.healthEndpoint;
    const aiHealthUrl = `${aiServiceBaseUrl}${aiHealthEndpoint}`;

    logger.info(
      `Starting AI service keep-alive with interval of ${environment.keepAlive.interval}ms to ${aiHealthUrl}`
    );

    if (this.aiServiceTimer) {
      clearInterval(this.aiServiceTimer);
    }

    // Periodic ping to the AI service
    this.aiServiceTimer = setInterval(async () => {
      try {
        const response = await axios.get(aiHealthUrl);
        logger.debug(
          `AI service keep-alive ping successful: ${response.status}`
        );
      } catch (error) {
        logger.error("AI service keep-alive ping failed:", error);
      }
    }, environment.keepAlive.interval);
  }

  // Ex: https://example.com/api/endpoint -> https://example.com
  private extractBaseUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch (error) {
      logger.error("Failed to parse AI service URL:", error);
      return null;
    }
  }

  public stop(): void {
    if (this.appTimer) {
      clearInterval(this.appTimer);
      this.appTimer = null;
      logger.info("App keep-alive service stopped");
    }

    if (this.aiServiceTimer) {
      clearInterval(this.aiServiceTimer);
      this.aiServiceTimer = null;
      logger.info("AI service keep-alive stopped");
    }
  }
}

export default new KeepAliveService();
